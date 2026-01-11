import type { Effect } from "effect";

import type { MigrationPlan } from "../plan/types";

export interface EmitOptions {
  dialect: string;
}

export class EmitError extends Error {
  override name = "EmitError";
}

export interface SqlEmitter {
  dialect: string;
  emit(plan: MigrationPlan): Effect.Effect<string, EmitError>;
}
