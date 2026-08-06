/// <reference types="@cloudflare/vitest-pool-workers/types" />
import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, describe, expect, it, inject } from "vitest";
import { Repository } from "@/lib/d1/repository";

beforeAll(async () => {
  await applyD1Migrations(env.DB, inject("d1Migrations"));
  await env.DB.batch([
    env.DB.prepare("INSERT INTO users (id,email) VALUES (?,?)").bind("owner-a","a@example.com"),
    env.DB.prepare("INSERT INTO users (id,email) VALUES (?,?)").bind("owner-b","b@example.com"),
  ]);
});

describe("D1 owner isolation", () => {
  it("does not allow another owner to select, update, or delete by id", async () => {
    const ownerA = new Repository(env.DB, { id: "owner-a", email: "a@example.com", displayName: null });
    const ownerB = new Repository(env.DB, { id: "owner-b", email: "b@example.com", displayName: null });
    const created = await ownerA.execute("movies", {
      method: "insert",
      values: { title: "Private film", status: "wishlist", media_type: "movie" },
      single: true,
    });
    const id = (created.data as { id: string }).id;

    await expect(ownerB.execute("movies", { method: "select", filters: [{ column: "id", operator: "eq", value: id }], single: true }))
      .resolves.toMatchObject({ data: null });
    await expect(ownerB.execute("movies", { method: "update", filters: [{ column: "id", operator: "eq", value: id }], values: { title: "Stolen" } }))
      .resolves.toMatchObject({ count: 0 });
    await expect(ownerB.execute("movies", { method: "delete", filters: [{ column: "id", operator: "eq", value: id }] }))
      .resolves.toMatchObject({ count: 0 });

    const visible = await ownerA.execute("movies", { method: "select", filters: [{ column: "id", operator: "eq", value: id }], single: true });
    expect(visible.data).toMatchObject({ title: "Private film" });
  });
});
