import {
  compileJsonSchemaToIR,
  compileJsonSchemasToIR,
  loadJsonSchemaFile,
  PostgresEmitter,
} from "@schemabase/core";

export type GenerateFormat = "sql" | "ir";

export interface GenerateProps {
  schemaPath: string;
  format: GenerateFormat;
  db: "postgres";
}

const toAbsPath = (p: string) =>
  p.startsWith("/") ? p : `${process.cwd()}/${p}`;

const generateOutput = async (
  schemaPath: string,
  format: GenerateFormat
): Promise<string> => {
  const absPath = toAbsPath(schemaPath);

  // Directory mode detection without Node internals:
  // if the path contains .json files, treat it as a schema directory.
  const glob = new Bun.Glob("*.json");
  const dirJsonFiles: string[] = [];
  try {
    for await (const rel of glob.scan(absPath)) {
      if (rel.endsWith(".ir.json") || rel === "expected.ir.json") {
        continue;
      }
      dirJsonFiles.push(rel);
    }
  } catch {
    // not a directory (or not readable as one) → file mode
  }

  const ir =
    dirJsonFiles.length > 0
      ? await (async () => {
          const schemas = await Promise.all(
            dirJsonFiles.map(async (rel) => {
              const p = `${absPath}/${rel}`;
              return { path: p, schema: await loadJsonSchemaFile(p) };
            })
          );
          return await compileJsonSchemasToIR(schemas, { baseDir: absPath });
        })()
      : await (async () => {
          const schema = await loadJsonSchemaFile(absPath);
          return await compileJsonSchemaToIR(schema, { file: absPath });
        })();

  if (format === "ir") {
    return `${JSON.stringify(ir, null, 2)}\n`;
  }

  return PostgresEmitter.emit(ir);
};

export const generateText = (
  schemaPath: string,
  format: GenerateFormat
): Promise<string> => generateOutput(schemaPath, format);
