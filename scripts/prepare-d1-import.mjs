import { readFile, writeFile } from "node:fs/promises";

const [, , source, destination = "mediavault-d1-import.json"] = process.argv;
if (!source) {
  console.error("Usage: npm run import:prepare -- <legacy-export.json> [output.json]");
  process.exit(1);
}
const data = JSON.parse(await readFile(source, "utf8"));
const tables = ["movies","books","music","tags","movie_tags","book_tags","music_tags","viewing_history","reading_history","listening_history"];
if (data.version !== "1.0" && data.version !== 1) throw new Error("Only MediaVault export v1 is supported");
const output = { version: "1.0", exported_at: data.exported_at || new Date().toISOString() };
for (const table of tables) {
  if (!Array.isArray(data[table])) throw new Error(`Missing array: ${table}`);
  output[table] = data[table].map((sourceRow, index) => {
    if (!sourceRow || typeof sourceRow !== "object" || Array.isArray(sourceRow)) throw new Error(`Invalid ${table} row ${index}`);
    const row = { ...sourceRow };
    delete row.user_id;
    delete row.owner_id;
    return row;
  });
}
await writeFile(destination, JSON.stringify(output, null, 2) + "\n", "utf8");
console.log(`Validated ${tables.reduce((sum, table) => sum + output[table].length, 0)} rows -> ${destination}`);
