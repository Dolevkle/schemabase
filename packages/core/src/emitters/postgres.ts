import { Effect } from "effect";

import type { Column } from "../ir/types";
import type { MigrationPlan, Operation } from "../plan/types";

import { EmitError, type SqlEmitter } from "./types";

const pgType = (col: Column): string => {
  switch (col.type) {
    case "uuid": {
      return "UUID";
    }
    case "timestamptz": {
      return "TIMESTAMPTZ";
    }
    case "int4": {
      return "INTEGER";
    }
    case "float8": {
      return "DOUBLE PRECISION";
    }
    case "bool": {
      return "BOOLEAN";
    }
    default: {
      return "TEXT";
    }
  }
};

const emitOp = (op: Operation): Effect.Effect<string, EmitError> => {
  switch (op.type) {
    case "CreateTable": {
      const lines = op.columns.map((c) => {
        const parts: string[] = [`${c.name} ${pgType(c)}`];
        if (!c.nullable) {
          parts.push("NOT NULL");
        }
        if (c.primaryKey) {
          parts.push("PRIMARY KEY");
        }
        return `  ${parts.join(" ")}`;
      });
      return Effect.succeed(
        `CREATE TABLE ${op.table} (\n${lines.join(",\n")}\n);`
      );
    }
    case "CreateIndex": {
      const unique = op.index.unique ? "UNIQUE " : "";
      const cols = op.index.columns.join(", ");
      return Effect.succeed(
        `CREATE ${unique}INDEX ${op.index.name} ON ${op.index.table} (${cols});`
      );
    }
    default: {
      // Should be unreachable if Operation is exhaustive; keeps lint happy.
      return Effect.fail(
        new EmitError({
          message: `Unsupported operation: ${(op as Operation).type}`,
        })
      );
    }
  }
};

export const PostgresEmitter: SqlEmitter = {
  dialect: "postgres",
  emit(plan: MigrationPlan): Effect.Effect<string, EmitError> {
    return Effect.map(
      Effect.all(plan.operations.map(emitOp)),
      (statements) => `${statements.join("\n\n")}\n`
    );
  },
};
