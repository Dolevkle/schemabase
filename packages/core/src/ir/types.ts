export type ScalarType =
  | "uuid"
  | "text"
  | "int4"
  | "float8"
  | "bool"
  | "timestamptz";

export type Provenance = {
  file: string;
  pointer: string;
};

export type Column = {
  name: string;
  type: ScalarType;
  nullable: boolean;
  primaryKey?: boolean;
};

export type Index = {
  name: string;
  table: string;
  columns: string[];
  unique: boolean;
};

export type ForeignKey = {
  name: string;
  table: string;
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
  onDelete?: "cascade" | "restrict" | "set null" | "no action";
  onUpdate?: "cascade" | "restrict" | "set null" | "no action";
};

export type Table = {
  name: string;
  columns: Column[];
  indexes: Index[];
  provenance: Provenance;
};

export type EnumType = {
  name: string;
  values: string[];
  provenance: Provenance;
};

export type RelationalIR = {
  tables: Table[];
  foreignKeys: ForeignKey[];
  enums: EnumType[];
};

