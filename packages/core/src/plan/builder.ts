import type { RelationalIR } from "../ir/types";
import type { MigrationPlan, Operation } from "./types";

export function buildPlan(ir: RelationalIR): MigrationPlan {
  const operations: Operation[] = [];

  for (const table of ir.tables) {
    operations.push({
      type: "CreateTable",
      table: table.name,
      columns: table.columns
    });

    for (const index of table.indexes) {
      operations.push({
        type: "CreateIndex",
        index
      });
    }
  }

  return { operations };
}

