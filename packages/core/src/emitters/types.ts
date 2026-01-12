import { Data, type Effect } from "effect";

import type { MigrationPlan } from "../plan/types";

export interface EmitOptions {
  dialect: string;
}

export class EmitError extends Data.TaggedError("EmitError")<{
  message: string;
}> {}

export interface SqlEmitter {
  dialect: string;
  emit(plan: MigrationPlan): Effect.Effect<string, EmitError>;
}
