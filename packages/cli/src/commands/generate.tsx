import {
  buildPlan,
  compileJsonSchemaToIR,
  loadJsonSchemaFile,
  PostgresEmitter,
} from "@schemabase/core";
import { Effect } from "effect";
import { Text, useApp } from "ink";
import { useEffect, useState } from "react";

export type GenerateFormat = "sql" | "ir" | "plan";

export interface GenerateProps {
  schemaPath: string;
  format: GenerateFormat;
  db: "postgres";
}

const makeGenerateEffect = (schemaPath: string, format: GenerateFormat) =>
  Effect.gen(function* makeGenerateEffect() {
    const schema = yield* loadJsonSchemaFile(schemaPath);
    const ir = yield* compileJsonSchemaToIR(schema, { file: schemaPath });
    if (format === "ir") {
      return `${JSON.stringify(ir, null, 2)}\n`;
    }

    const plan = buildPlan(ir);
    if (format === "plan") {
      return `${JSON.stringify(plan, null, 2)}\n`;
    }

    return yield* PostgresEmitter.emit(plan);
  });

export const generateText = async (
  schemaPath: string,
  format: GenerateFormat
): Promise<string> =>
  await Effect.runPromise(makeGenerateEffect(schemaPath, format));

export const Generate = ({ schemaPath, format }: GenerateProps) => {
  const { exit } = useApp();
  const [output, setOutput] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const text = await generateText(schemaPath, format);
        if (cancelled) {
          return;
        }
        setOutput(text);
        exit();
      } catch (error) {
        if (cancelled) {
          return;
        }
        setOutput(`Error: ${String(error)}\n`);
        exit(new Error(String(error)));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schemaPath, format, exit]);

  return <Text>{output}</Text>;
};
