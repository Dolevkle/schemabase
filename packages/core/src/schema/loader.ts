import { Effect } from "effect";
import type { JsonSchema } from "./types";

export class SchemaLoadError extends Error {
  override name = "SchemaLoadError";
}

export function loadJsonSchemaFile(path: string): Effect.Effect<JsonSchema, SchemaLoadError> {
  return Effect.tryPromise({
    try: async () => {
      const text = await Bun.file(path).text();
      const json = JSON.parse(text) as unknown;
      if (!json || typeof json !== "object") {
        throw new SchemaLoadError(`Schema file is not an object: ${path}`);
      }
      return json as JsonSchema;
    },
    catch: (e) => new SchemaLoadError(String(e))
  });
}

