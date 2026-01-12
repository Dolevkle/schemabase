import type { Column, ForeignKey, RelationalIR, Table } from "../ir/types";
import type { SqlEmitter } from "./types";

const enumTypeName = (table: string, column: string) =>
  `${table}_${column}_enum`;

const pgColumnType = (table: string, col: Column): string => {
  const t = col.type;

  if (t.enum && t.enum.length > 0) {
    return enumTypeName(table, col.name);
  }

  if (t.jsonType === "object" || t.jsonType === "array") {
    return "JSONB";
  }

  if (t.jsonType === "integer") {
    return "INTEGER";
  }
  if (t.jsonType === "number") {
    return "DOUBLE PRECISION";
  }
  if (t.jsonType === "boolean") {
    return "BOOLEAN";
  }

  // string
  switch (t.format) {
    case "uuid": {
      return "UUID";
    }
    case "date-time": {
      return "TIMESTAMPTZ";
    }
    default: {
      return "TEXT";
    }
  }
};

const emitCreateEnum = (name: string, values: string[]): string => {
  const escaped = values.map((v) => `'${v.replaceAll("'", "''")}'`).join(", ");
  return `CREATE TYPE ${name} AS ENUM (${escaped});`;
};

const emitCreateTable = (t: Table): string => {
  const pkCols = t.primaryKey?.columns ?? [];
  const hasCompositePk = pkCols.length > 0;

  const lines: string[] = [];
  for (const c of t.columns) {
    const parts: string[] = [`${c.name} ${pgColumnType(t.name, c)}`];
    if (!c.nullable) {
      parts.push("NOT NULL");
    }
    if (!hasCompositePk && c.primaryKey) {
      parts.push("PRIMARY KEY");
    }
    lines.push(`  ${parts.join(" ")}`);
  }

  if (hasCompositePk) {
    lines.push(`  PRIMARY KEY (${pkCols.join(", ")})`);
  }

  return `CREATE TABLE ${t.name} (\n${lines.join(",\n")}\n);`;
};

const emitAddForeignKey = (fk: ForeignKey): string => {
  const cols = fk.columns.join(", ");
  const refCols = fk.referencedColumns.join(", ");
  const parts: string[] = [
    `ALTER TABLE ${fk.table} ADD CONSTRAINT ${fk.name} FOREIGN KEY (${cols}) REFERENCES ${fk.referencedTable} (${refCols})`,
  ];
  if (fk.onDelete) {
    parts.push(`ON DELETE ${fk.onDelete.toUpperCase()}`);
  }
  if (fk.onUpdate) {
    parts.push(`ON UPDATE ${fk.onUpdate.toUpperCase()}`);
  }
  return `${parts.join(" ")};`;
};

const emitCreateIndex = (idx: Table["indexes"][number]): string => {
  const unique = idx.unique ? "UNIQUE " : "";
  return `CREATE ${unique}INDEX ${idx.name} ON ${idx.table} (${idx.columns.join(
    ", "
  )});`;
};

export const PostgresEmitter: SqlEmitter = {
  dialect: "postgres",
  emit(model: RelationalIR): string {
    const statements: string[] = [];

    // Enums first
    for (const e of model.enums) {
      statements.push(emitCreateEnum(e.name, e.values));
    }

    // Tables
    for (const t of model.tables) {
      statements.push(emitCreateTable(t));
    }

    // Foreign keys (2nd pass, supports cycles)
    for (const fk of model.foreignKeys) {
      statements.push(emitAddForeignKey(fk));
    }

    // Indexes
    for (const t of model.tables) {
      for (const idx of t.indexes) {
        statements.push(emitCreateIndex(idx));
      }
    }

    return `${statements.join("\n\n")}\n`;
  },
};
