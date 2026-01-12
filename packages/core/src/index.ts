export { loadJsonSchemaFile, SchemaLoadError } from "./schema/loader";
export type { JsonSchema } from "./schema/types";
export { resolveJsonSchema, SchemaResolveError } from "./schema/resolver";

export type {
  Column,
  EnumType,
  ForeignKey,
  Index,
  Provenance,
  RelationalIR,
  Table,
} from "./ir/types";

export {
  compileJsonSchemaToIR,
  compileJsonSchemasToIR,
  CompileError,
} from "./compile/compile";
export {
  defaultTableNameFromIdOrTitle,
  pluralize,
  toSnakeCase,
} from "./compile/naming";

export { EmitError, type SqlEmitter } from "./emitters/types";
export { PostgresEmitter } from "./emitters/postgres";
