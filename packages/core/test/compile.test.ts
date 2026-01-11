import { describe, expect, test } from "bun:test";
import { compileJsonSchemaToIR } from "../src/compile/compile";
import type { JsonSchema } from "../src/schema/types";
import type { RelationalIR } from "../src/ir/types";

const fixtureDir = new URL("./fixtures/", import.meta.url);

async function readJson(rel: string) {
  const path = new URL(rel, fixtureDir);
  const text = await Bun.file(path).text();
  return JSON.parse(text) as unknown;
}

describe("compileJsonSchemaToIR", () => {
  test("simple user schema -> IR", async () => {
    const schema = (await readJson("simple-user.json")) as JsonSchema;
    const ir = compileJsonSchemaToIR(schema, { file: "simple-user.json" });
    const expected = (await readJson("simple-user.ir.json")) as RelationalIR;
    expect(ir).toEqual(expected);
  });
});

