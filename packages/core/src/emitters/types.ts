import type { MigrationPlan } from "../plan/types";

export interface EmitOptions {
  dialect: string;
}

export interface SqlEmitter {
  dialect: string;
  emit(plan: MigrationPlan): string;
}
