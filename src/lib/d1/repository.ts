import type { AuthenticatedUser } from "@/lib/auth";
import { z } from "zod";

const filterSchema = z.object({
  column: z.string().min(1).max(64).regex(/^[a-z_]+$/),
  operator: z.enum(["eq", "in", "gte", "lte", "lt", "ilike"]),
  value: z.unknown(),
}).strict();

type Filter = z.infer<typeof filterSchema>;

const valuesSchema = z.record(z.string().min(1).max(64), z.unknown());

export const dataRequestSchema = z.object({
  method: z.enum(["select", "insert", "update", "delete"]),
  select: z.string().max(2_000).optional(),
  filters: z.array(filterSchema).max(20).default([]),
  order: z.object({
    column: z.string().min(1).max(64).regex(/^[a-z_]+$/),
    ascending: z.boolean(),
  }).strict().optional(),
  limit: z.number().int().min(1).max(500).optional(),
  head: z.boolean().optional(),
  values: z.union([valuesSchema, z.array(valuesSchema).min(1).max(500)]).optional(),
  single: z.boolean().optional(),
}).strict().superRefine((request, context) => {
  if ((request.method === "insert" || request.method === "update") && request.values === undefined) {
    context.addIssue({ code: "custom", path: ["values"], message: "Values are required" });
  }
  if ((request.method === "update" || request.method === "delete") && request.filters.length === 0) {
    context.addIssue({ code: "custom", path: ["filters"], message: "A filter is required for mutations" });
  }
});

export type DataRequest = z.input<typeof dataRequestSchema>;

type TableConfig = { columns: readonly string[]; mutable: readonly string[]; relation?: string };

const configs: Record<string, TableConfig> = {
  users: { columns: ["id","email","display_name","avatar_url","created_at","updated_at"], mutable: ["display_name","avatar_url"] },
  profiles: { columns: ["id","email","display_name","avatar_url","created_at","updated_at"], mutable: ["display_name","avatar_url"] },
  tags: { columns: ["id","owner_id","name","color","created_at","updated_at"], mutable: ["name","color"] },
  movies: { columns: ["id","owner_id","tmdb_id","title","poster_url","director","year","overview","rating","status","note","watched_at","media_type","number_of_seasons","number_of_episodes","watched_episode","created_at","updated_at"], mutable: ["tmdb_id","title","poster_url","director","year","overview","rating","status","note","watched_at","media_type","number_of_seasons","number_of_episodes","watched_episode"] },
  books: { columns: ["id","owner_id","google_books_id","title","cover_url","author","year","description","rating","status","note","read_at","created_at","updated_at"], mutable: ["google_books_id","title","cover_url","author","year","description","rating","status","note","read_at"] },
  music: { columns: ["id","owner_id","spotify_id","title","artwork_url","artist","year","type","rating","status","note","listened_at","created_at","updated_at"], mutable: ["spotify_id","title","artwork_url","artist","year","type","rating","status","note","listened_at"] },
  movie_tags: { columns: ["owner_id","movie_id","tag_id"], mutable: ["movie_id","tag_id"] },
  book_tags: { columns: ["owner_id","book_id","tag_id"], mutable: ["book_id","tag_id"] },
  music_tags: { columns: ["owner_id","music_id","tag_id"], mutable: ["music_id","tag_id"] },
  viewing_history: { columns: ["id","owner_id","movie_id","watched_at","note","created_at"], mutable: ["movie_id","watched_at","note"], relation: "movies" },
  reading_history: { columns: ["id","owner_id","book_id","read_at","note","created_at"], mutable: ["book_id","read_at","note"], relation: "books" },
  listening_history: { columns: ["id","owner_id","music_id","listened_at","note","created_at"], mutable: ["music_id","listened_at","note"], relation: "music" },
};

const aliases: Record<string, string> = { user_id: "owner_id" };
const timestamped = new Set(["users","tags","movies","books","music"]);

function tableName(input: string): string {
  const table = input === "profiles" ? "users" : input;
  if (!configs[input]) throw new Error("Unsupported table");
  return table;
}
function columnName(config: TableConfig, input: string): string {
  const col = aliases[input] || input;
  if (!config.columns.includes(col)) throw new Error("Unsupported column");
  return col;
}
function outputRow(row: Record<string, unknown>): Record<string, unknown> {
  if ("owner_id" in row) {
    row.user_id = row.owner_id;
    delete row.owner_id;
  }
  for (const key of ["movies","books","music"]) {
    if (typeof row[key] === "string") {
      try { row[key] = JSON.parse(row[key] as string); } catch { /* nullable join */ }
    }
  }
  return row;
}
function splitSelection(raw: string): string[] {
  const result: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of raw) {
    if (char === "(") depth += 1;
    if (char === ")") depth = Math.max(0, depth - 1);
    if (char === "," && depth === 0) {
      if (current.trim()) result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) result.push(current.trim());
  return result;
}
function selection(config: TableConfig, raw = "*"): string {
  if (raw === "*" || raw.trim() === "") return config.columns.map((c) => `t."${c}"`).join(",");
  const fields = splitSelection(raw).filter((value) => !value.includes("("));
  return fields.map((field) => {
    const clean = field.split("!")[0];
    const col = columnName(config, clean);
    return `t."${col}" AS "${clean}"`;
  }).join(",") || config.columns.map((c) => `t."${c}"`).join(",");
}
function conditions(config: TableConfig, filters: Filter[] = [], userId: string) {
  const clauses = ['t."owner_id" = ?'];
  const values: unknown[] = [userId];
  for (const filter of filters) {
    const col = columnName(config, filter.column);
    if (col === "owner_id") continue;
    if (filter.operator === "in") {
      const list = Array.isArray(filter.value) ? filter.value.slice(0, 100) : [];
      if (!list.length) { clauses.push("0 = 1"); continue; }
      clauses.push(`t."${col}" IN (${list.map(() => "?").join(",")})`);
      values.push(...list);
    } else {
      const op = filter.operator === "eq" ? "=" : filter.operator === "gte" ? ">=" : filter.operator === "lte" ? "<=" : filter.operator === "lt" ? "<" : "LIKE";
      clauses.push(`t."${col}" ${op} ?`);
      values.push(filter.operator === "ilike" && typeof filter.value === "string" ? filter.value : filter.value);
    }
  }
  return { sql: clauses.join(" AND "), values };
}
function cleanValues(config: TableConfig, input: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  for (const key of config.mutable) if (key in input) result[key] = input[key] ?? null;
  return result;
}

export class Repository {
  constructor(private db: D1Database, private user: AuthenticatedUser) {}

  async execute(tableInput: string, request: DataRequest) {
    const config = configs[tableInput];
    if (!config) throw new Error("Unsupported table");
    const table = tableName(tableInput);
    if (table === "users" && request.method !== "select" && request.method !== "update") throw new Error("Unsupported operation");
    switch (request.method) {
      case "select": return this.select(table, config, request);
      case "insert": return this.insert(table, config, request);
      case "update": return this.update(table, config, request);
      case "delete": return this.delete(table, config, request);
      default: throw new Error("Unsupported operation");
    }
  }

  private async select(table: string, config: TableConfig, req: DataRequest) {
    const isUsers = table === "users";
    const where = isUsers
      ? { sql: 't."id" = ?', values: [this.user.id] as unknown[] }
      : conditions(config, req.filters, this.user.id);
    if (req.head) {
      const row = await this.db.prepare(`SELECT COUNT(*) AS count FROM "${table}" t WHERE ${where.sql}`).bind(...where.values).first<{count:number}>();
      return { data: null, count: row?.count || 0 };
    }
    let fields = selection(config, req.select);
    let join = "";
    if (config.relation && req.select?.includes(`${config.relation}!inner`)) {
      const parent = configs[config.relation];
      const fk = config.relation === "movies" ? "movie_id" : config.relation === "books" ? "book_id" : "music_id";
      const requested = req.select.match(new RegExp(`${config.relation}!inner\\(([^)]+)\\)`))?.[1].split(",").map((x) => x.trim()) || ["id","title"];
      const safe = requested.map((col) => columnName(parent, col));
      fields += `, json_object(${safe.flatMap((col) => [`'${col}'`, `p."${col}"`]).join(",")}) AS "${config.relation}"`;
      join = ` INNER JOIN "${config.relation}" p ON p.id = t."${fk}" AND p.owner_id = t.owner_id`;
    }
    let sql = `SELECT ${fields} FROM "${table}" t${join} WHERE ${where.sql}`;
    if (req.order) {
      const col = columnName(config, req.order.column);
      sql += ` ORDER BY t."${col}" ${req.order.ascending ? "ASC" : "DESC"}`;
    }
    if (req.limit) sql += ` LIMIT ${Math.min(Math.max(1, req.limit), 500)}`;
    const result = await this.db.prepare(sql).bind(...where.values).all<Record<string, unknown>>();
    const data = result.results.map(outputRow);
    return { data: req.single ? data[0] || null : data, count: data.length };
  }

  private async insert(table: string, config: TableConfig, req: DataRequest) {
    const inputs = Array.isArray(req.values) ? req.values : [req.values || {}];
    if (inputs.length > 500) throw new Error("Too many rows");
    const now = new Date().toISOString();
    const statements = inputs.map((input) => {
      const row = cleanValues(config, input);
      row.owner_id = this.user.id;
      if (config.columns.includes("id")) row.id = typeof input.id === "string" ? input.id : crypto.randomUUID();
      if (config.columns.includes("created_at")) row.created_at = typeof input.created_at === "string" ? input.created_at : now;
      if (config.columns.includes("updated_at")) row.updated_at = now;
      const cols = Object.keys(row);
      return this.db.prepare(`INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(",")}) VALUES (${cols.map(() => "?").join(",")}) RETURNING *`).bind(...Object.values(row));
    });
    const results = await this.db.batch<Record<string, unknown>>(statements);
    const rows = results.flatMap((result) => result.results || []).map(outputRow);
    return { data: req.single ? rows[0] || null : rows, count: rows.length };
  }

  private async update(table: string, config: TableConfig, req: DataRequest) {
    if (!req.filters?.length) throw new Error("A filter is required for updates");
    const row = cleanValues(config, Array.isArray(req.values) ? req.values[0] : req.values || {});
    if (timestamped.has(table)) row.updated_at = new Date().toISOString();
    const entries = Object.entries(row);
    if (!entries.length) throw new Error("No mutable fields");
    const where = table === "users"
      ? { sql: 't."id" = ?', values: [this.user.id] as unknown[] }
      : conditions(config, req.filters, this.user.id);
    const sql = `UPDATE "${table}" AS t SET ${entries.map(([key]) => `"${key}" = ?`).join(",")} WHERE ${where.sql} RETURNING *`;
    const result = await this.db.prepare(sql).bind(...entries.map(([, value]) => value), ...where.values).all<Record<string, unknown>>();
    const data = result.results.map(outputRow);
    return { data: req.single ? data[0] || null : data, count: data.length };
  }

  private async delete(table: string, config: TableConfig, req: DataRequest) {
    if (!req.filters?.length) throw new Error("A filter is required for deletes");
    const where = conditions(config, req.filters, this.user.id);
    const result = await this.db.prepare(`DELETE FROM "${table}" AS t WHERE ${where.sql} RETURNING *`).bind(...where.values).all<Record<string, unknown>>();
    const data = result.results.map(outputRow);
    return { data, count: data.length };
  }
}
