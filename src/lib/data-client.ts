/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

type Filter = { column: string; operator: "eq" | "in" | "gte" | "lte" | "lt" | "ilike"; value: unknown };
type Result<T = any> = { data: T | null; count: number | null; error: Error | null };

class DataQuery<T = any> implements PromiseLike<Result<T>> {
  private method: "select" | "insert" | "update" | "delete" = "select";
  private selection = "*";
  private filters: Filter[] = [];
  private sort?: { column: string; ascending: boolean };
  private maxRows?: number;
  private values?: Record<string, unknown> | Record<string, unknown>[];
  private one = false;
  private head = false;

  constructor(private table: string) {}

  select(columns = "*", options?: { count?: "exact"; head?: boolean }) {
    this.selection = columns;
    this.head = options?.head === true;
    return this;
  }
  insert(values: Record<string, unknown> | Record<string, unknown>[]) {
    this.method = "insert";
    this.values = values;
    return this;
  }
  update(values: Record<string, unknown>) {
    this.method = "update";
    this.values = values;
    return this;
  }
  delete() {
    this.method = "delete";
    return this;
  }
  eq(column: string, value: unknown) {
    this.filters.push({ column, operator: "eq", value });
    return this;
  }
  in(column: string, value: unknown[]) {
    this.filters.push({ column, operator: "in", value });
    return this;
  }
  gte(column: string, value: unknown) {
    this.filters.push({ column, operator: "gte", value });
    return this;
  }
  lt(column: string, value: unknown) {
    this.filters.push({ column, operator: "lt", value });
    return this;
  }
  ilike(column: string, value: unknown) {
    this.filters.push({ column, operator: "ilike", value });
    return this;
  }
  lte(column: string, value: unknown) {
    this.filters.push({ column, operator: "lte", value });
    return this;
  }
  order(column: string, options?: { ascending?: boolean }) {
    this.sort = { column, ascending: options?.ascending !== false };
    return this;
  }
  limit(value: number) {
    this.maxRows = value;
    return this;
  }
  single() {
    this.one = true;
    return this as unknown as DataQuery<T>;
  }

  async execute(): Promise<Result<T>> {
    try {
      const response = await fetch(`/api/data/${encodeURIComponent(this.table)}`, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: this.method,
          select: this.selection,
          filters: this.filters,
          order: this.sort,
          limit: this.maxRows,
          values: this.values,
          single: this.one,
          head: this.head,
        }),
      });
      const payload = await response.json() as { data?: T; count?: number; error?: string };
      if (!response.ok) return { data: null, count: null, error: new Error(payload.error || "Request failed") };
      return { data: payload.data ?? null, count: payload.count ?? null, error: null };
    } catch (error) {
      return { data: null, count: null, error: error instanceof Error ? error : new Error("Request failed") };
    }
  }

  then<TResult1 = Result<T>, TResult2 = never>(
    onfulfilled?: ((value: Result<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

let userPromise: Promise<{ id: string; email: string; user_metadata: Record<string, unknown> } | null> | null = null;

async function getUser() {
  if (!userPromise) {
    userPromise = fetch("/api/me", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        const { user } = await response.json() as { user: { id: string; email: string; displayName: string | null } };
        return { id: user.id, email: user.email, user_metadata: { full_name: user.displayName } };
      })
      .catch(() => null);
  }
  return userPromise;
}

export function createClient() {
  return {
    from<T = any>(table: string) {
      return new DataQuery<T>(table);
    },
    auth: {
      async getUser() {
        const user = await getUser();
        return { data: { user }, error: user ? null : new Error("Not authenticated") };
      },
      async getSession() {
        const user = await getUser();
        return { data: { session: user ? { user } : null }, error: null };
      },
      async signOut() {
        userPromise = null;
        location.href = new URL("/cdn-cgi/access/logout", location.origin).toString();
        return { error: null };
      },
    },
  };
}
