import type { MigrationPlan } from "../plan/types";

export type EmitOptions = {
  dialect: string;
};

export type SqlEmitter = {
  dialect: string;
  emit(plan: MigrationPlan): string;
};

