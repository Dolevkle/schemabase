import type { RelationalIR } from "../ir/types";

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
  emit(model: RelationalIR): string;
}
