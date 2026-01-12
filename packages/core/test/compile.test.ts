import { describe, expect, test } from "bun:test";

import type { RelationalIR } from "../src/ir/types";
import type { JsonSchema } from "../src/schema/types";

import {
  compileJsonSchemaToIR,
  compileJsonSchemasToIR,
} from "../src/compile/compile";

const fixtureDir = new URL("./fixtures/", import.meta.url);

const readJson = async (rel: string) => {
  const path = new URL(rel, fixtureDir);
  const text = await Bun.file(path).text();
  return JSON.parse(text) as unknown;
};

const writeJson = async (absPath: string, value: unknown) => {
  await Bun.write(absPath, `${JSON.stringify(value, null, 2)}\n`);
};

const tmpDir = () =>
  `${process.cwd()}/.tmp/schemabase-test/${crypto.randomUUID()}`;

describe("compileJsonSchemaToIR", () => {
  test("simple user schema -> IR", async () => {
    const schema = (await readJson("simple-user.json")) as JsonSchema;
    const ir = await compileJsonSchemaToIR(schema, {
      file: "simple-user.json",
    });
    const expected = (await readJson("simple-user.ir.json")) as RelationalIR;
    expect(ir).toEqual(expected);
  });

  test("nested object -> JSONB column", async () => {
    const schema: JsonSchema = {
      $id: "Post",
      properties: {
        id: { format: "uuid", type: "string" },
        meta: { properties: { views: { type: "integer" } }, type: "object" },
      },
      required: ["id"],
      type: "object",
    };

    const ir = await compileJsonSchemaToIR(schema, { file: "post.json" });
    const posts = ir.tables.find((t) => t.name === "posts");
    const metaCol = posts?.columns.find((c) => c.name === "meta");

    expect(metaCol?.type.jsonType).toBe("object");
  });
});

describe("compileJsonSchemasToIR", () => {
  test("1:N relationship via $ref", async () => {
    const dir = tmpDir();
    await Bun.$`mkdir -p ${dir}`;

    await writeJson(`${dir}/user.json`, {
      $id: "User",
      properties: { id: { format: "uuid", type: "string" } },
      required: ["id"],
      type: "object",
    });

    await writeJson(`${dir}/post.json`, {
      $id: "Post",
      properties: {
        authorId: { $ref: "./user.json" },
        id: { format: "uuid", type: "string" },
      },
      required: ["id", "authorId"],
      type: "object",
    });

    const load = async (p: string) =>
      JSON.parse(await Bun.file(p).text()) as JsonSchema;

    const ir = await compileJsonSchemasToIR([
      { path: `${dir}/user.json`, schema: await load(`${dir}/user.json`) },
      { path: `${dir}/post.json`, schema: await load(`${dir}/post.json`) },
    ]);

    expect(ir.foreignKeys).toContainEqual(
      expect.objectContaining({
        columns: ["author_id"],
        referencedColumns: ["id"],
        referencedTable: "users",
        table: "posts",
      })
    );
  });

  test("1:1 relationship via $ref + unique", async () => {
    const dir = tmpDir();
    await Bun.$`mkdir -p ${dir}`;

    await writeJson(`${dir}/user.json`, {
      $id: "User",
      properties: { id: { format: "uuid", type: "string" } },
      required: ["id"],
      type: "object",
    });

    await writeJson(`${dir}/profile.json`, {
      $id: "Profile",
      properties: {
        id: { format: "uuid", type: "string" },
        userId: { $ref: "./user.json", "x-schemabase": { unique: true } },
      },
      required: ["id", "userId"],
      type: "object",
    });

    const load = async (p: string) =>
      JSON.parse(await Bun.file(p).text()) as JsonSchema;

    const ir = await compileJsonSchemasToIR([
      { path: `${dir}/user.json`, schema: await load(`${dir}/user.json`) },
      {
        path: `${dir}/profile.json`,
        schema: await load(`${dir}/profile.json`),
      },
    ]);

    const profiles = ir.tables.find((t) => t.name === "profiles");
    expect(profiles?.indexes).toContainEqual(
      expect.objectContaining({
        columns: ["user_id"],
        unique: true,
      })
    );
  });

  test("N:M relationship with composite primary key", async () => {
    const dir = tmpDir();
    await Bun.$`mkdir -p ${dir}`;

    await writeJson(`${dir}/user.json`, {
      $id: "User",
      properties: { id: { format: "uuid", type: "string" } },
      required: ["id"],
      type: "object",
    });

    await writeJson(`${dir}/tag.json`, {
      $id: "Tag",
      properties: { id: { format: "uuid", type: "string" } },
      required: ["id"],
      type: "object",
    });

    await writeJson(`${dir}/user_tag.json`, {
      $id: "UserTag",
      properties: {
        tagId: { $ref: "./tag.json" },
        userId: { $ref: "./user.json" },
      },
      type: "object",
      "x-schemabase": { primaryKey: ["userId", "tagId"] },
    });

    const load = async (p: string) =>
      JSON.parse(await Bun.file(p).text()) as JsonSchema;

    const ir = await compileJsonSchemasToIR([
      { path: `${dir}/user.json`, schema: await load(`${dir}/user.json`) },
      { path: `${dir}/tag.json`, schema: await load(`${dir}/tag.json`) },
      {
        path: `${dir}/user_tag.json`,
        schema: await load(`${dir}/user_tag.json`),
      },
    ]);

    const userTags = ir.tables.find((t) => t.name === "user_tags");
    expect(userTags?.primaryKey?.columns).toEqual(["user_id", "tag_id"]);

    // Should have FKs to both tables
    expect(ir.foreignKeys).toContainEqual(
      expect.objectContaining({ referencedTable: "users", table: "user_tags" })
    );
    expect(ir.foreignKeys).toContainEqual(
      expect.objectContaining({ referencedTable: "tags", table: "user_tags" })
    );
  });

  test("composite primary key with scalar property (not FK)", async () => {
    const dir = tmpDir();
    await Bun.$`mkdir -p ${dir}`;

    await writeJson(`${dir}/user.json`, {
      $id: "User",
      properties: { id: { format: "uuid", type: "string" } },
      required: ["id"],
      type: "object",
    });

    // Junction table with a scalar `code` property in the composite PK
    await writeJson(`${dir}/user_code.json`, {
      $id: "UserCode",
      properties: {
        code: { type: "string" },
        userId: { $ref: "./user.json" },
      },
      type: "object",
      "x-schemabase": { primaryKey: ["userId", "code"] },
    });

    const load = async (p: string) =>
      JSON.parse(await Bun.file(p).text()) as JsonSchema;

    const ir = await compileJsonSchemasToIR([
      { path: `${dir}/user.json`, schema: await load(`${dir}/user.json`) },
      {
        path: `${dir}/user_code.json`,
        schema: await load(`${dir}/user_code.json`),
      },
    ]);

    const userCodes = ir.tables.find((t) => t.name === "user_codes");

    // Verify column names: user_id (FK) and code (scalar, not code_id)
    const colNames = userCodes?.columns.map((c) => c.name);
    expect(colNames).toContain("user_id");
    expect(colNames).toContain("code");

    // Composite PK should use actual column names
    expect(userCodes?.primaryKey?.columns).toEqual(["user_id", "code"]);
  });

  test("custom primary key (non-id) is correctly referenced via $ref", async () => {
    const dir = tmpDir();
    await Bun.$`mkdir -p ${dir}`;

    // Country has "code" as primary key, not "id"
    await writeJson(`${dir}/country.json`, {
      $id: "Country",
      properties: {
        code: { type: "string" },
        name: { type: "string" },
      },
      required: ["code", "name"],
      type: "object",
      "x-schemabase": { primaryKey: ["code"] },
    });

    // City references country via $ref
    await writeJson(`${dir}/city.json`, {
      $id: "City",
      properties: {
        countryCode: { $ref: "./country.json" },
        id: { format: "uuid", type: "string" },
        name: { type: "string" },
      },
      required: ["id", "name", "countryCode"],
      type: "object",
    });

    const load = async (p: string) =>
      JSON.parse(await Bun.file(p).text()) as JsonSchema;

    const ir = await compileJsonSchemasToIR([
      {
        path: `${dir}/country.json`,
        schema: await load(`${dir}/country.json`),
      },
      { path: `${dir}/city.json`, schema: await load(`${dir}/city.json`) },
    ]);

    // FK should reference "code" (the actual PK), not "id"
    const fk = ir.foreignKeys.find((f) => f.referencedTable === "countrys");
    expect(fk?.referencedColumns).toEqual(["code"]);
  });
});
