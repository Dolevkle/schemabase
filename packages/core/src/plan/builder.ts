import type { RelationalIR } from "../ir/types";
import type { MigrationPlan, Operation } from "./types";

export const buildPlan = (ir: RelationalIR): MigrationPlan => {
  const operations: Operation[] = [];

  for (const table of ir.tables) {
    operations.push({
      columns: table.columns,
      table: table.name,
      type: "CreateTable",
    });

    for (const index of table.indexes) {
      operations.push({
        index,
        type: "CreateIndex",
      });
    }
  }

  return { operations };
};
