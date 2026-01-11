import { describe, expect, test } from "bun:test";

import type { JsonSchema } from "../src/schema/types";

import { compileJsonSchemaToIR } from "../src/compile/compile";
import { PostgresEmitter } from "../src/emitters/postgres";
import { buildPlan } from "../src/plan/builder";

describe("PostgresEmitter", () => {
  test("emits SQL for simple schema", () => {
    const schema: JsonSchema = {
      $id: "User",
      properties: {
        email: {
          format: "email",
          type: "string",
          "x-schemabase": { unique: true },
        },
        id: { format: "uuid", type: "string" },
      },
      required: ["id", "email"],
      type: "object",
    };

    const ir = compileJsonSchemaToIR(schema, { file: "inline" });
    const plan = buildPlan(ir);
    const sql = PostgresEmitter.emit(plan);
    expect(sql).toContain("CREATE TABLE users");
    expect(sql).toContain("id UUID NOT NULL PRIMARY KEY");
    expect(sql).toContain(
      "CREATE UNIQUE INDEX users_email_uidx ON users (email);"
    );
  });
});
