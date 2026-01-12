import type {
  Column,
  ForeignKey,
  Index,
  RelationalIR,
  Table,
} from "../ir/types";
import type { JsonSchema } from "../schema/types";

import { resolveJsonSchema } from "../schema/resolver";
import { inferEnums } from "./inference";
import { toSnakeCase } from "./naming";
import {
  type SchemaRegistry,
  buildSchemaRegistry,
  inferColumnTypeFromSchema,
  tableNameFromSchemaFile,
} from "./registry";

export class CompileError extends Error {
  readonly _tag = "CompileError";

  constructor(message: string) {
    super(message);
    this.name = "CompileError";
  }
}

const schemaType = (schema: JsonSchema): string | undefined => {
  const t = schema.type;
  if (!t) {
    return undefined;
  }
  return Array.isArray(t) ? t[0] : t;
};

const inferIndexes = (tableName: string, schema: JsonSchema): Index[] => {
  const props = schema.properties ?? {};
  const indexes: Index[] = [];
  for (const [propName, propSchema] of Object.entries(props)) {
    // Cross-file refs are compiled into FK columns whose name may differ from
    // `toSnakeCase(propName)` (e.g. `user` → `user_id`), so handle those
    // indexes during FK compilation instead.
    if (typeof propSchema.$ref === "string" && isExternalRef(propSchema.$ref)) {
      continue;
    }

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
  /**
   * Used to validate/resolve external refs. Defaults to directory of `file`.
   */
  baseDir?: string;
  /**
   * Optional registry for multi-file compilation (FK type/table resolution).
   * Keyed by absolute file path.
   */
  registry?: SchemaRegistry;
}

const isExternalRef = (ref: string) => !ref.startsWith("#");

const resolveRefPath = (ref: string, fromFile: string) => {
  const filePart = ref.split("#")[0] ?? ref;
  if (!filePart) {
    return null;
  }
  return new URL(filePart, `file://${fromFile}`).pathname;
};

const fkColumnName = (propName: string) => {
  if (propName.endsWith("Id") || propName.endsWith("_id")) {
    return toSnakeCase(propName);
  }
  return toSnakeCase(`${propName}_id`);
};

const baseDirFromFile = (filePath: string) =>
  new URL(".", `file://${filePath.replaceAll("\\", "/")}`).pathname;

interface CompiledProperty {
  column: Column;
  fk?: ForeignKey;
  indexes?: Index[];
}

const nullableFrom = (args: {
  propName: string;
  required: Set<string>;
  pkPropSet?: Set<string>;
}) => {
  const { propName, required, pkPropSet } = args;
  const isPk = pkPropSet?.has(propName) ?? false;
  return isPk ? false : !required.has(propName);
};

const compileExternalRefProperty = (args: {
  propName: string;
  propSchema: JsonSchema;
  tableName: string;
  required: Set<string>;
  pkPropSet?: Set<string>;
  opts: CompileOptions;
}): CompiledProperty | null => {
  const { propName, propSchema, tableName, required, pkPropSet, opts } = args;
  if (
    !(typeof propSchema.$ref === "string" && isExternalRef(propSchema.$ref))
  ) {
    return null;
  }

  const colName = fkColumnName(propName);
  const nullable = nullableFrom({
    propName,
    required,
    ...(pkPropSet ? { pkPropSet } : {}),
  });

  const refPath = resolveRefPath(propSchema.$ref, opts.file);
  const target = refPath ? opts.registry?.get(refPath) : undefined;
  const refPk = target?.primaryKey;
  const colType = refPk?.type ?? { format: "uuid", jsonType: "string" };

  const ext = propSchema["x-schemabase"];
  const indexes =
    ext?.unique === true
      ? ([
          {
            columns: [colName],
            name: `${tableName}_${colName}_uidx`,
            table: tableName,
            unique: true,
          },
        ] satisfies Index[])
      : [];

  const base: CompiledProperty = {
    column: {
      name: colName,
      nullable,
      type: { ...colType, ref: propSchema.$ref },
    },
    ...(indexes.length > 0 ? { indexes } : {}),
  };

  if (!target) {
    return base;
  }

  return {
    ...base,
    fk: {
      columns: [colName],
      name: `${tableName}_${colName}_fkey`,
      referencedColumns: [refPk?.column ?? "id"],
      referencedTable: target.tableName,
      table: tableName,
    },
  };
};

const compileNestedProperty = (args: {
  propName: string;
  propSchema: JsonSchema;
  required: Set<string>;
  pkPropSet?: Set<string>;
}): CompiledProperty | null => {
  const { propName, propSchema, required, pkPropSet } = args;
  const pt = schemaType(propSchema);
  if (pt !== "object" && pt !== "array") {
    return null;
  }
  return {
    column: {
      name: propSchema["x-schemabase"]?.column ?? toSnakeCase(propName),
      nullable: nullableFrom({
        propName,
        required,
        ...(pkPropSet ? { pkPropSet } : {}),
      }),
      type: { jsonType: pt },
    },
  };
};

const compileScalarProperty = (args: {
  propName: string;
  propSchema: JsonSchema;
  required: Set<string>;
  pkPropSet?: Set<string>;
}): CompiledProperty => {
  const { propName, propSchema, required, pkPropSet } = args;
  const nullable = nullableFrom({
    propName,
    required,
    ...(pkPropSet ? { pkPropSet } : {}),
  });
  const columnName =
    propSchema["x-schemabase"]?.column ?? toSnakeCase(propName);
  const primaryKey = propName === "id" && !nullable;
  return {
    column: {
      name: columnName,
      nullable,
      ...(primaryKey ? { primaryKey: true } : {}),
      type: inferColumnTypeFromSchema(propSchema),
    },
  };
};

const compileProperty = (args: {
  propName: string;
  propSchema: JsonSchema;
  tableName: string;
  required: Set<string>;
  pkPropSet?: Set<string>;
  opts: CompileOptions;
}): CompiledProperty => {
  const ext = compileExternalRefProperty(args);
  if (ext) {
    return ext;
  }
  const nested = compileNestedProperty(args);
  if (nested) {
    return nested;
  }
  return compileScalarProperty(args);
};

const compileProperties = (args: {
  properties: Record<string, JsonSchema>;
  tableName: string;
  required: Set<string>;
  pkPropSet?: Set<string>;
  opts: CompileOptions;
}): { columns: Column[]; foreignKeys: ForeignKey[]; indexes: Index[] } => {
  const { properties, tableName, required, pkPropSet, opts } = args;
  const columns: Column[] = [];
  const foreignKeys: ForeignKey[] = [];
  const indexes: Index[] = [];

  for (const [propName, propSchema] of Object.entries(properties)) {
    const compiled = compileProperty({
      opts,
      ...(pkPropSet ? { pkPropSet } : {}),
      propName,
      propSchema,
      required,
      tableName,
    });
    columns.push(compiled.column);
    if (compiled.fk) {
      foreignKeys.push(compiled.fk);
    }
    if (compiled.indexes && compiled.indexes.length > 0) {
      indexes.push(...compiled.indexes);
    }
  }

  return { columns, foreignKeys, indexes };
};

const compileTable = (
  schema: JsonSchema,
  opts: CompileOptions,
  resolvedSchema: JsonSchema
): { table: Table; foreignKeys: ForeignKey[] } => {
  const t = schemaType(resolvedSchema);
  if (t !== "object") {
    throw new CompileError(
      `Top-level schema must be an object (got ${t ?? "unknown"})`
    );
  }

  const tableName = tableNameFromSchemaFile(opts.file, schema);

  const required = resolvedSchema.required
    ? new Set(resolvedSchema.required)
    : new Set<string>();
  const properties = resolvedSchema.properties ?? {};

  const pkProps = schema["x-schemabase"]?.primaryKey;
  const pkPropSet =
    Array.isArray(pkProps) && pkProps.length > 0 ? new Set(pkProps) : undefined;

  const compiledProps = compileProperties({
    opts,
    ...(pkPropSet ? { pkPropSet } : {}),
    properties,
    required,
    tableName,
  });

  const { columns } = compiledProps;
  const { foreignKeys } = compiledProps;
  const { indexes } = compiledProps;

  if (columns.length === 0) {
    throw new CompileError("Schema has no properties to infer columns from.");
  }

  // Add standard indexes inferred from scalar properties.
  indexes.push(...inferIndexes(tableName, resolvedSchema));

  // Composite PK (for explicit junction tables)
  // Use actual column names: fkColumnName for external refs, toSnakeCase for scalars
  const primaryKey =
    Array.isArray(pkProps) && pkProps.length > 0
      ? {
          columns: pkProps.map((p) => {
            const propSchema = properties[p];
            if (
              propSchema &&
              typeof propSchema.$ref === "string" &&
              isExternalRef(propSchema.$ref)
            ) {
              return fkColumnName(p);
            }
            return propSchema?.["x-schemabase"]?.column ?? toSnakeCase(p);
          }),
        }
      : undefined;

  return {
    foreignKeys,
    table: {
      columns,
      indexes,
      name: tableName,
      ...(primaryKey ? { primaryKey } : {}),
      provenance: { file: opts.file, pointer: "/" },
    },
  };
};

export const compileJsonSchemaToIR = async (
  schema: JsonSchema,
  opts: CompileOptions
): Promise<RelationalIR> => {
  const baseDir = opts.baseDir ?? baseDirFromFile(opts.file);
  const resolved = await resolveJsonSchema(schema, {
    baseDir,
    file: opts.file,
  });

  const { table, foreignKeys } = compileTable(schema, opts, resolved);
  let ir: RelationalIR = {
    enums: [],
    foreignKeys,
    tables: [table],
  };
  ir = { ...ir, enums: inferEnums(ir) };
  return ir;
};

export const compileJsonSchemasToIR = async (
  schemas: { path: string; schema: JsonSchema }[],
  opts?: { baseDir?: string }
): Promise<RelationalIR> => {
  // Build registry from original (unresolved) schemas; resolver is for local refs.
  const registry = buildSchemaRegistry(schemas);

  const tables: Table[] = [];
  const foreignKeys: ForeignKey[] = [];
  for (const { path, schema } of schemas) {
    const resolved = await resolveJsonSchema(schema, {
      baseDir:
        opts?.baseDir ??
        new URL(".", `file://${path.replaceAll("\\", "/")}`).pathname,
      file: path,
    });

    const compiled = compileTable(schema, { file: path, registry }, resolved);
    tables.push(compiled.table);
    foreignKeys.push(...compiled.foreignKeys);
  }

  let ir: RelationalIR = { enums: [], foreignKeys, tables };
  ir = { ...ir, enums: inferEnums(ir) };
  return ir;
};
