import type { JsonSchema } from "../schema/types";
import type { Column, Index, RelationalIR, ScalarType, Table } from "../ir/types";
import { defaultTableNameFromIdOrTitle, toSnakeCase } from "./naming";

export class CompileError extends Error {
  override name = "CompileError";
}

function schemaType(schema: JsonSchema): string | undefined {
  const t = schema.type;
  if (!t) return undefined;
  return Array.isArray(t) ? t[0] : t;
}

function inferScalarType(schema: JsonSchema): ScalarType {
  const t = schemaType(schema);
  if (t === "string") {
    if (schema.enum && Array.isArray(schema.enum) && schema.enum.every((v) => typeof v === "string")) {
      return "text";
    }
    switch (schema.format) {
      case "uuid":
        return "uuid";
      case "date-time":
        return "timestamptz";
      case "email":
        return "text";
      default:
        return "text";
    }
  }
  if (t === "integer") return "int4";
  if (t === "number") return "float8";
  if (t === "boolean") return "bool";
  return "text";
}

function inferIndexes(tableName: string, schema: JsonSchema): Index[] {
  const props = schema.properties ?? {};
  const indexes: Index[] = [];
  for (const [propName, propSchema] of Object.entries(props)) {
    const ext = propSchema["x-schemabase"];
    if (!ext || typeof ext !== "object") continue;
    const unique = Boolean((ext as any).unique);
    const index = Boolean((ext as any).index);
    if (!unique && !index) continue;

    const col = toSnakeCase(propName);
    indexes.push({
      name: `${tableName}_${col}_${unique ? "uidx" : "idx"}`,
      table: tableName,
      columns: [col],
      unique
    });
  }
  return indexes;
}

export type CompileOptions = {
  file: string;
};

export function compileJsonSchemaToIR(schema: JsonSchema, opts: CompileOptions): RelationalIR {
  const t = schemaType(schema);
  if (t !== "object") {
    throw new CompileError(`Top-level schema must be an object (got ${t ?? "unknown"})`);
  }

  const explicit = schema["x-schemabase"]?.table;
  const nameSource = explicit ?? schema.$id ?? schema.title ?? "schema";
  const tableName = defaultTableNameFromIdOrTitle(nameSource);

  const required = new Set(schema.required ?? []);
  const properties = schema.properties ?? {};

  const columns: Column[] = [];
  for (const [propName, propSchema] of Object.entries(properties)) {
    const columnName = propSchema["x-schemabase"]?.column ?? toSnakeCase(propName);
    const nullable = !required.has(propName);
    const primaryKey = propName === "id" && !nullable;
    columns.push({
      name: columnName,
      type: inferScalarType(propSchema),
      nullable,
      ...(primaryKey ? { primaryKey: true } : {})
    });
  }

  if (columns.length === 0) {
    throw new CompileError("Schema has no properties to infer columns from.");
  }

  const table: Table = {
    name: tableName,
    columns,
    indexes: inferIndexes(tableName, schema),
    provenance: { file: opts.file, pointer: "/" }
  };

  return {
    tables: [table],
    foreignKeys: [],
    enums: []
  };
}

