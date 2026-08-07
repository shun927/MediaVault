/// <reference types="@cloudflare/vitest-pool-workers/types" />
import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, describe, expect, it, inject } from "vitest";
import { dataRequestSchema, Repository } from "@/lib/d1/repository";
import { importV1 } from "@/lib/d1/transfer";
import { appendHistory } from '@/lib/d1/history';

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

  it("rejects unknown operations and mutations without filters", async () => {
    expect(() => dataRequestSchema.parse({ method: "truncate" })).toThrow();
    expect(() => dataRequestSchema.parse({ method: "delete", filters: [] })).toThrow();
    expect(() => dataRequestSchema.parse({ method: "update", filters: [], values: { title: "Unsafe" } })).toThrow();

    const ownerA = new Repository(env.DB, { id: "owner-a", email: "a@example.com", displayName: null });
    await expect(ownerA.execute("movies", { method: "update", values: { title: "Unsafe" } })).rejects.toThrow("filter");
    await expect(ownerA.execute("movies", { method: "delete" })).rejects.toThrow("filter");
  });

  it("rejects relationships that point to another owner", async () => {
    const ownerA = new Repository(env.DB, { id: "owner-a", email: "a@example.com", displayName: null });
    const ownerB = new Repository(env.DB, { id: "owner-b", email: "b@example.com", displayName: null });
    const movie = await ownerA.execute("movies", {
      method: "insert",
      values: { title: "Owner A only", status: "wishlist", media_type: "movie" },
      single: true,
    });
    const tag = await ownerB.execute("tags", {
      method: "insert",
      values: { name: "Owner B tag", color: "#000000" },
      single: true,
    });

    await expect(ownerB.execute("movie_tags", {
      method: "insert",
      values: {
        movie_id: (movie.data as { id: string }).id,
        tag_id: (tag.data as { id: string }).id,
      },
    })).rejects.toThrow(/owner mismatch/);
  });

  it("remaps colliding IDs when the same export is imported by another owner", async () => {
    const payload = {
      version: "1.0",
      movies: [{ id: "shared-movie", title: "Shared export", status: "wishlist", media_type: "movie" }],
      tags: [{ id: "shared-tag", name: "Shared tag", color: "#123456" }],
      movie_tags: [{ movie_id: "shared-movie", tag_id: "shared-tag" }],
    } as const;

    await importV1(env.DB, { id: "owner-a", email: "a@example.com", displayName: null }, payload);
    await importV1(env.DB, { id: "owner-b", email: "b@example.com", displayName: null }, payload);

    const ownerB = new Repository(env.DB, { id: "owner-b", email: "b@example.com", displayName: null });
    const movie = await ownerB.execute("movies", { method: "select", filters: [{ column: "title", operator: "eq", value: "Shared export" }], single: true });
    const tag = await ownerB.execute("tags", { method: "select", filters: [{ column: "name", operator: "eq", value: "Shared tag" }], single: true });
    const links = await ownerB.execute("movie_tags", { method: "select" });

    expect((movie.data as { id: string }).id).not.toBe("shared-movie");
    expect((tag.data as { id: string }).id).not.toBe("shared-tag");
    expect(links.data).toContainEqual(expect.objectContaining({
      movie_id: (movie.data as { id: string }).id,
      tag_id: (tag.data as { id: string }).id,
    }));
  });

  it("adds history and completion metadata only for the authenticated owner", async () => {
    const userA = { id: "owner-a", email: "a@example.com", displayName: null };
    const userB = { id: "owner-b", email: "b@example.com", displayName: null };
    const ownerA = new Repository(env.DB, userA);
    const created = await ownerA.execute("movies", {
      method: "insert", values: { title: "Quick log film", status: "wishlist", media_type: "movie" }, single: true,
    });
    const id = (created.data as { id: string }).id;
    const occurredAt = "2026-08-07T12:00:00.000Z";

    await expect(appendHistory(env.DB, userB, "movies", id, occurredAt)).resolves.toBeNull();
    await expect(appendHistory(env.DB, userA, "movies", id, occurredAt, "再鑑賞")).resolves.toMatchObject({ occurredAt });

    const movie = await ownerA.execute("movies", { method: "select", filters: [{ column: "id", operator: "eq", value: id }], single: true });
    const history = await ownerA.execute("viewing_history", { method: "select", filters: [{ column: "movie_id", operator: "eq", value: id }] });
    expect(movie.data).toMatchObject({ status: "watched", watched_at: occurredAt });
    expect(history.data).toHaveLength(1);
    expect(history.data).toContainEqual(expect.objectContaining({ user_id: "owner-a", note: "再鑑賞", watched_at: occurredAt }));
  });
});
