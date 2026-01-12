import { Data, Effect } from "effect";

import type { JsonSchema } from "./types";

export class SchemaLoadError extends Data.TaggedError("SchemaLoadError")<{
  message: string;
}> {}

export const loadJsonSchemaFile = (
  path: string
): Effect.Effect<JsonSchema, SchemaLoadError> =>
  Effect.gen(function* () {
    const text = yield* Effect.tryPromise({
      catch: (e) => new SchemaLoadError({ message: String(e) }),
      try: () => Bun.file(path).text(),
    });

    const json = JSON.parse(text) as unknown;
    if (!json || typeof json !== "object") {
      return yield* new SchemaLoadError({
        message: `Schema file is not an object: ${path}`,
      });
    }

    return json as JsonSchema;
  });
