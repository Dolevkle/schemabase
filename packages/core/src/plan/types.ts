import type { Column, Index } from "../ir/types";

export type CreateTableOp = {
  type: "CreateTable";
  table: string;
  columns: Column[];
};

export type CreateIndexOp = {
  type: "CreateIndex";
  index: Index;
};

export type Operation = CreateTableOp | CreateIndexOp;

export type MigrationPlan = {
  operations: Operation[];
};

