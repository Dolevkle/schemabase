export { loadJsonSchemaFile, SchemaLoadError } from "./schema/loader";
export type { JsonSchema } from "./schema/types";

export type {
  Column,
  EnumType,
  ForeignKey,
  Index,
  Provenance,
  RelationalIR,
  ScalarType,
  Table,
} from "./ir/types";

export { compileJsonSchemaToIR, CompileError } from "./compile/compile";
export {
  defaultTableNameFromIdOrTitle,
  pluralize,
  toSnakeCase,
} from "./compile/naming";

export { buildPlan } from "./plan/builder";
export type { MigrationPlan, Operation } from "./plan/types";

export type { SqlEmitter } from "./emitters/types";
export { PostgresEmitter } from "./emitters/postgres";
