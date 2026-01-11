export type ScalarType =
  | "uuid"
  | "text"
  | "int4"
  | "float8"
  | "bool"
  | "timestamptz";

export interface Provenance {
  file: string;
  pointer: string;
}

export interface Column {
  name: string;
  type: ScalarType;
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
