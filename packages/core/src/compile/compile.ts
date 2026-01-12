import { Data, Effect } from "effect";

import type {
  Column,
  Index,
  RelationalIR,
  ScalarType,
  Table,
} from "../ir/types";
import type { JsonSchema } from "../schema/types";

import { defaultTableNameFromIdOrTitle, toSnakeCase } from "./naming";

export class CompileError extends Data.TaggedError("CompileError")<{
  message: string;
}> {}

const schemaType = (schema: JsonSchema): string | undefined => {
  const t = schema.type;
  if (!t) {
    return undefined;
  }
  return Array.isArray(t) ? t[0] : t;
};

const scalarTypeFromString = (format: string | undefined): ScalarType => {
  switch (format) {
    case "uuid": {
      return "uuid";
    }
    case "date-time": {
      return "timestamptz";
    }
    default: {
      return "text";
    }
  }
};

const inferScalarType = (schema: JsonSchema): ScalarType => {
  const t = schemaType(schema);
  if (t === "string") {
    return scalarTypeFromString(schema.format);
  }
  if (t === "integer") {
    return "int4";
  }
  if (t === "number") {
    return "float8";
  }
  if (t === "boolean") {
    return "bool";
  }
  return "text";
};

const inferIndexes = (tableName: string, schema: JsonSchema): Index[] => {
  const props = schema.properties ?? {};
  const indexes: Index[] = [];
  for (const [propName, propSchema] of Object.entries(props)) {
    const ext = propSchema["x-schemabase"];
    const unique = ext?.unique === true;
    const index = ext?.index === true;
    if (!unique && !index) {
      continue;
    }

    const col = toSnakeCase(propName);
    indexes.push({
      columns: [col],
      name: `${tableName}_${col}_${unique ? "uidx" : "idx"}`,
      table: tableName,
      unique,
    });
  }
  return indexes;
};

export interface CompileOptions {
  file: string;
}

const compileTable = (
  schema: JsonSchema,
  opts: CompileOptions
): Effect.Effect<Table, CompileError> => {
  const t = schemaType(schema);
  if (t !== "object") {
    return Effect.fail(
      new CompileError({
        message: `Top-level schema must be an object (got ${t ?? "unknown"})`,
      })
    );
  }

  const explicit = schema["x-schemabase"]?.table;
  const nameSource = explicit ?? schema.$id ?? schema.title ?? "schema";
  const tableName = defaultTableNameFromIdOrTitle(nameSource);

  const required = schema.required
    ? new Set(schema.required)
    : new Set<string>();
  const properties = schema.properties ?? {};

  const columns: Column[] = [];
  for (const [propName, propSchema] of Object.entries(properties)) {
    const columnName =
      propSchema["x-schemabase"]?.column ?? toSnakeCase(propName);
    const nullable = !required.has(propName);
    const primaryKey = propName === "id" && !nullable;
    columns.push({
      name: columnName,
      nullable,
      ...(primaryKey ? { primaryKey: true } : {}),
      type: inferScalarType(propSchema),
    });
  }

  if (columns.length === 0) {
    return Effect.fail(
      new CompileError({
        message: "Schema has no properties to infer columns from.",
      })
    );
  }

  return Effect.succeed({
    columns,
    indexes: inferIndexes(tableName, schema),
    name: tableName,
    provenance: { file: opts.file, pointer: "/" },
  });
};

export const compileJsonSchemaToIR = (
  schema: JsonSchema,
  opts: CompileOptions
): Effect.Effect<RelationalIR, CompileError> =>
  Effect.map(compileTable(schema, opts), (table) => ({
    enums: [],
    foreignKeys: [],
    tables: [table],
  }));
