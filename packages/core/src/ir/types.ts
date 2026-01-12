export interface Provenance {
  file: string;
  pointer: string;
}

export type JsonScalarType = "string" | "integer" | "number" | "boolean";
export type JsonType = JsonScalarType | "object" | "array";

export interface ColumnType {
  jsonType: JsonType;
  format?: string;
  enum?: string[];
  /**
   * For cross-file refs (FKs), this is the raw $ref string (e.g. "./user.json").
   * For local refs, resolver inlines the schema and removes $ref.
   */
  ref?: string;
}

export interface Column {
  name: string;
  type: ColumnType;
  nullable: boolean;
  primaryKey?: boolean;
}

export interface Index {
  name: string;
  table: string;
  columns: string[];
  unique: boolean;
}

export interface ForeignKey {
  name: string;
  table: string;
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
  onDelete?: "cascade" | "restrict" | "set null" | "no action";
  onUpdate?: "cascade" | "restrict" | "set null" | "no action";
}

export interface Table {
  name: string;
  columns: Column[];
  indexes: Index[];
  /**
   * Optional composite primary key. When present, emit as a table-level
   * PRIMARY KEY (a, b, ...).
   */
  primaryKey?: { columns: string[] };
  provenance: Provenance;
}

export interface EnumType {
  name: string;
  values: string[];
  provenance: Provenance;
}

export interface RelationalIR {
  tables: Table[];
  foreignKeys: ForeignKey[];
  enums: EnumType[];
}
