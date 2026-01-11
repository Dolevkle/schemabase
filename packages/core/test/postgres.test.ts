import { describe, expect, test } from "bun:test";
import { buildPlan } from "../src/plan/builder";
import { compileJsonSchemaToIR } from "../src/compile/compile";
import type { JsonSchema } from "../src/schema/types";
import { PostgresEmitter } from "../src/emitters/postgres";

describe("PostgresEmitter", () => {
  test("emits SQL for simple schema", async () => {
    const schema: JsonSchema = {
      $id: "User",
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        email: { type: "string", format: "email", "x-schemabase": { unique: true } }
      },
      required: ["id", "email"]
    };

    const ir = compileJsonSchemaToIR(schema, { file: "inline" });
    const plan = buildPlan(ir);
    const sql = PostgresEmitter.emit(plan);
    expect(sql).toContain("CREATE TABLE users");
    expect(sql).toContain("id UUID NOT NULL PRIMARY KEY");
    expect(sql).toContain("CREATE UNIQUE INDEX users_email_uidx ON users (email);");
  });
});

