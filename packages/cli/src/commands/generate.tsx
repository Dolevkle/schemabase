import React, { useEffect, useState } from "react";
import { Text, useApp } from "ink";
import { Effect } from "effect";
import {
  buildPlan,
  compileJsonSchemaToIR,
  loadJsonSchemaFile,
  PostgresEmitter
} from "@schemabase/core";

export type GenerateFormat = "sql" | "ir" | "plan";

export type GenerateProps = {
  schemaPath: string;
  format: GenerateFormat;
  db: "postgres";
};

function makeGenerateEffect(schemaPath: string, format: GenerateFormat) {
  return Effect.gen(function* () {
    const schema = yield* loadJsonSchemaFile(schemaPath);
    const ir = compileJsonSchemaToIR(schema, { file: schemaPath });
    if (format === "ir") return JSON.stringify(ir, null, 2) + "\n";

    const plan = buildPlan(ir);
    if (format === "plan") return JSON.stringify(plan, null, 2) + "\n";

    return PostgresEmitter.emit(plan);
  });
}

export async function generateText(schemaPath: string, format: GenerateFormat): Promise<string> {
  return await Effect.runPromise(makeGenerateEffect(schemaPath, format));
}

export function Generate({ schemaPath, format }: GenerateProps) {
  const { exit } = useApp();
  const [output, setOutput] = useState<string>(""); // render once ready

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const text = await generateText(schemaPath, format);
        if (cancelled) return;
        setOutput(text);
        exit();
      } catch (e) {
        if (cancelled) return;
        setOutput(`Error: ${String(e)}\n`);
        exit(new Error(String(e)));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schemaPath, format, exit]);

  return <Text>{output}</Text>;
}

