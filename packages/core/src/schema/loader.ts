import type { JsonSchema } from "./types";

export class SchemaLoadError extends Error {
  readonly _tag = "SchemaLoadError";

  constructor(message: string) {
    super(message);
    this.name = "SchemaLoadError";
  }
}

export const loadJsonSchemaFile = async (path: string): Promise<JsonSchema> => {
  const text = await Bun.file(path).text();

  const json = JSON.parse(text) as unknown;
  if (!json || typeof json !== "object") {
    throw new SchemaLoadError(`Schema file is not an object: ${path}`);
  }

  return json as JsonSchema;
};
