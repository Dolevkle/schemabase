import type { Column, Index } from "../ir/types";

export interface CreateTableOp {
  type: "CreateTable";
  table: string;
  columns: Column[];
}

export interface CreateIndexOp {
  type: "CreateIndex";
  index: Index;
}

export type Operation = CreateTableOp | CreateIndexOp;

export interface MigrationPlan {
  operations: Operation[];
}
