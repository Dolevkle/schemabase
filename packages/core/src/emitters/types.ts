import type { MigrationPlan } from "../plan/types";

export interface EmitOptions {
  dialect: string;
}

export class EmitError extends Error {
  readonly _tag = "EmitError";

  constructor(message: string) {
    super(message);
    this.name = "EmitError";
  }
}

export interface SqlEmitter {
  dialect: string;
  emit(plan: MigrationPlan): string;
}
