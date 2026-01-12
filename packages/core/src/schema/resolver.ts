import type { JsonSchema } from "./types";

export class SchemaResolveError extends Error {
  readonly _tag = "SchemaResolveError";

  constructor(message: string) {
    super(message);
    this.name = "SchemaResolveError";
  }
}

export interface ResolveOptions {
  /**
   * The "file" label used for errors. Typically the path to the root schema file
   * or a synthetic name like "inline".
   */
  file: string;
  /**
   * Optional base directory to resolve relative file $ref values from.
   * If omitted, only local refs (#/...) are supported.
   */
  baseDir?: string;
}

type AnyObject = Record<string, unknown>;

const isObject = (u: unknown): u is AnyObject =>
  typeof u === "object" && u !== null && !Array.isArray(u);

const deepClone = <T>(v: T): T => structuredClone(v);

const decodeJsonPointerSegment = (s: string) =>
  s.replaceAll("~1", "/").replaceAll("~0", "~");

const getByJsonPointer = (root: unknown, pointer: string): unknown => {
  if (pointer === "" || pointer === "#") {
    return root;
  }
  if (!pointer.startsWith("#/")) {
    throw new SchemaResolveError(`Unsupported JSON pointer: ${pointer}`);
  }
  const parts = pointer.slice(2).split("/").map(decodeJsonPointerSegment);

  let cur: unknown = root;
  for (const part of parts) {
    if (isObject(cur)) {
      cur = cur[part];
      continue;
    }
    throw new SchemaResolveError(
      `Invalid pointer '${pointer}' (hit non-object)`
    );
  }
  return cur;
};

const splitRef = (
  ref: string
): { filePart: string | null; pointer: string } => {
  // Examples:
  //  - "#/$defs/User" => { filePart: null, pointer: "#/$defs/User" }
  //  - "./other.json#/$defs/User" => { filePart: "./other.json", pointer: "#/$defs/User" }
  const idx = ref.indexOf("#");
  if (idx === -1) {
    return { filePart: ref, pointer: "#" };
  }
  const filePart = idx === 0 ? null : ref.slice(0, idx);
  const pointer = `#${ref.slice(idx + 1)}`;
  return { filePart, pointer };
};

const mergeSchemaObjects = (
  base: JsonSchema,
  override: JsonSchema
): JsonSchema => {
  // Simple, predictable merge: objects merge recursively, arrays replace.
  const out: AnyObject = deepClone(base) as AnyObject;
  for (const [k, v] of Object.entries(override as AnyObject)) {
    if (k === "$ref") {
      continue;
    }
    const prev = out[k];
    if (isObject(prev) && isObject(v)) {
      out[k] = mergeSchemaObjects(prev as JsonSchema, v as JsonSchema);
    } else {
      out[k] = deepClone(v);
    }
  }
  return out as JsonSchema;
};

const readJsonFile = async (path: string): Promise<JsonSchema> => {
  const text = await Bun.file(path).text();
  const json = JSON.parse(text) as unknown;
  if (!isObject(json)) {
    throw new SchemaResolveError(`Schema file is not an object: ${path}`);
  }
  return json as JsonSchema;
};

const normalizeDefs = (schema: JsonSchema): JsonSchema => {
  // Normalize `definitions` into `$defs` so downstream code has one place to look.
  const defs = schema.definitions;
  if (!defs) {
    return schema;
  }
  const $defs = schema.$defs ?? {};
  return {
    ...schema,
    $defs: { ...defs, ...$defs },
  };
};

const normalizeRefString = (ref: string): string => {
  // Normalize legacy definitions refs to $defs.
  if (ref.startsWith("#/definitions/")) {
    return `#/$defs/${ref.slice("#/definitions/".length)}`;
  }
  const { filePart, pointer } = splitRef(ref);
  if (!filePart) {
    if (pointer.startsWith("#/definitions/")) {
      return `#/$defs/${pointer.slice("#/definitions/".length)}`;
    }
    return ref;
  }
  if (pointer.startsWith("#/definitions/")) {
    return `${filePart}#/$defs/${pointer.slice("#/definitions/".length)}`;
  }
  return ref;
};

/**
 * Normalize + validate $ref across the schema.
 *
 * Note: We intentionally preserve `$ref` strings (rather than inlining the
 * referenced schema) so the compiler can infer relationships from refs.
 */
export const resolveJsonSchema = async (
  schema: JsonSchema,
  opts: ResolveOptions
): Promise<JsonSchema> => {
  const root = normalizeDefs(deepClone(schema));
  const externalCache = new Map<string, JsonSchema>();

  const resolveRefTarget = async (ref: string): Promise<JsonSchema> => {
    const normalized = normalizeRefString(ref);
    const { filePart, pointer } = splitRef(normalized);

    if (!filePart) {
      const target = getByJsonPointer(root, pointer);
      if (!isObject(target)) {
        throw new SchemaResolveError(
          `Invalid $ref target (not an object): ${opts.file}:${ref}`
        );
      }
      return normalizeDefs(target as JsonSchema);
    }

    if (!opts.baseDir) {
      throw new SchemaResolveError(
        `External $ref requires baseDir: ${opts.file}:${ref}`
      );
    }

    const base = opts.baseDir.endsWith("/") ? opts.baseDir : `${opts.baseDir}/`;
    const path = new URL(filePart, `file://${base.replaceAll("\\", "/")}`)
      .pathname;

    const extRoot = externalCache.get(path) ?? (await readJsonFile(path));
    externalCache.set(path, extRoot);
    const normalizedExtRoot = normalizeDefs(extRoot);

    const target = getByJsonPointer(normalizedExtRoot, pointer);
    if (!isObject(target)) {
      throw new SchemaResolveError(`Invalid $ref target: ${path}:${ref}`);
    }
    return normalizeDefs(target as JsonSchema);
  };

  const walk = async (node: unknown): Promise<unknown> => {
    if (Array.isArray(node)) {
      const out = [];
      for (const item of node) {
        out.push(await walk(item));
      }
      return out;
    }
    if (!isObject(node)) {
      return node;
    }

    const out: AnyObject = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === "enum") {
        out[k] = v;
        continue;
      }
      if (k === "$ref" && typeof v === "string") {
        const normalized = normalizeRefString(v);
        const { filePart } = splitRef(normalized);

        // Local refs are inlined (so compiler can treat them as nested objects → JSONB).
        // External refs are preserved for FK inference, but validated.
        if (!filePart) {
          const target = await resolveRefTarget(normalized);
          const merged = mergeSchemaObjects(
            target,
            normalizeDefs(node as JsonSchema)
          );
          // Remove $ref after inlining.
          delete (merged as AnyObject).$ref;
          return await walk(merged);
        }

        // External ref: validate and keep as-is (normalized).
        await resolveRefTarget(normalized);
        out[k] = normalized;
        continue;
      }
      out[k] = await walk(v);
    }

    return normalizeDefs(out as JsonSchema);
  };

  return (await walk(root)) as JsonSchema;
};
