import type { ColumnType } from "../ir/types";
import type { JsonSchema } from "../schema/types";

import { defaultTableNameFromIdOrTitle, toSnakeCase } from "./naming";

export interface RegistryEntry {
  path: string;
  schema: JsonSchema;
  tableName: string;
  primaryKey: { column: string; type: ColumnType };
}

export type SchemaRegistry = Map<string, RegistryEntry>;

const schemaType = (schema: JsonSchema): string | undefined => {
  const t = schema.type;
  if (!t) {
    return undefined;
  }
  return Array.isArray(t) ? t[0] : t;
};

export const inferColumnTypeFromSchema = (schema: JsonSchema): ColumnType => {
  const t = schemaType(schema);
  if (t === "object" || t === "array") {
    return { jsonType: t };
  }
  if (t === "string" || t === "integer" || t === "number" || t === "boolean") {
    const out: ColumnType = { jsonType: t };
    if (typeof schema.format === "string") {
      out.format = schema.format;
    }
    if (
      Array.isArray(schema.enum) &&
      schema.enum.every((v) => typeof v === "string")
    ) {
      out.enum = schema.enum;
    }
    return out;
  }
  return { jsonType: "string" };
};

export const tableNameFromSchemaFile = (
  filePath: string,
  schema: JsonSchema
): string => {
  const explicit = schema["x-schemabase"]?.table;
  if (explicit) {
    return explicit;
  }
  const base = filePath.split("/").at(-1) ?? "schema";
  const stem = base.endsWith(".json") ? base.slice(0, -".json".length) : base;
  const nameSource = schema.$id ?? schema.title ?? stem;
  return defaultTableNameFromIdOrTitle(nameSource);
};

export const buildSchemaRegistry = (
  entries: { path: string; schema: JsonSchema }[]
): SchemaRegistry => {
  const registry: SchemaRegistry = new Map();
  for (const { path, schema } of entries) {
    const tableName = tableNameFromSchemaFile(path, schema);

    const props = schema.properties ?? {};

    // Respect x-schemabase.primaryKey override; use first column for FK references.
    // For composite PKs, FKs reference the first column (edge case).
    const customPk = schema["x-schemabase"]?.primaryKey;
    const pkPropName =
      Array.isArray(customPk) && customPk.length > 0 ? customPk[0] : "id";
    const pkPropSchema = props[pkPropName];
    const pkType = pkPropSchema
      ? inferColumnTypeFromSchema(pkPropSchema)
      : ({ jsonType: "string" } as const);
    const pkColumn =
      pkPropSchema?.["x-schemabase"]?.column ?? toSnakeCase(pkPropName);

    registry.set(path, {
      path,
      primaryKey: { column: pkColumn, type: pkType },
      schema,
      tableName,
    });
  }
  return registry;
};
