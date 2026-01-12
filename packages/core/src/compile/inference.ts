import type { EnumType, RelationalIR } from "../ir/types";

const enumTypeName = (table: string, column: string) =>
  `${table}_${column}_enum`;

export const inferEnums = (ir: RelationalIR): EnumType[] => {
  const enums: EnumType[] = [];
  const seen = new Set<string>();

  for (const table of ir.tables) {
    for (const col of table.columns) {
      const values = col.type.enum;
      if (!values || values.length === 0) {
        continue;
      }
      const name = enumTypeName(table.name, col.name);
      if (seen.has(name)) {
        continue;
      }
      seen.add(name);
      enums.push({
        name,
        provenance: table.provenance,
        values,
      });
    }
  }
  return enums;
};
