#!/usr/bin/env bun
import { render } from "ink";
import React from "react";

import {
  Generate,
  generateText,
  type GenerateFormat,
} from "./commands/generate";

type ParsedArgs =
  | { help: true }
  | {
      db: "postgres";
      format: GenerateFormat;
      help: false;
      schemaPath: string;
    };

const HELP_TEXT = [
  "schemabase",
  "",
  "Usage:",
  "  schemabase generate <schema.json> [--format sql|ir|plan] [--db postgres]",
  "",
  "Examples:",
  "  schemabase generate schema.json",
  "  schemabase generate schema.json --format ir",
  "  schemabase generate schema.json --format plan",
  "",
].join("\n");

const isHelp = (cmd: string | undefined) =>
  !cmd || cmd === "-h" || cmd === "--help";

const parseFormat = (v: string | undefined): GenerateFormat | undefined => {
  if (v === "sql" || v === "ir" || v === "plan") {
    return v;
  }
  return undefined;
};

const parseDb = (v: string | undefined): "postgres" | undefined => {
  if (v === "postgres") {
    return v;
  }
  return undefined;
};

const parseFlags = (rest: string[]) => {
  const flags = new Map<string, string>();
  for (let i = 0; i < rest.length; i += 1) {
    const key = rest[i];
    if (!key?.startsWith("--")) {
      continue;
    }

    const value = rest[i + 1];
    if (typeof value === "string" && !value.startsWith("--")) {
      flags.set(key, value);
      i += 1;
      continue;
    }

    flags.set(key, "");
  }
  return flags;
};

const parseArgs = (argv: string[]): ParsedArgs => {
  const [cmd, schemaPath, ...rest] = argv;
  if (isHelp(cmd) || cmd !== "generate" || !schemaPath) {
    return { help: true };
  }

  const flags = parseFlags(rest);
  const rawFormat = flags.get("--format");
  const rawDb = flags.get("--db");

  const parsedFormat = rawFormat ? parseFormat(rawFormat) : undefined;
  const parsedDb = rawDb ? parseDb(rawDb) : undefined;

  if (rawFormat && !parsedFormat) {
    return { help: true };
  }
  if (rawDb && !parsedDb) {
    return { help: true };
  }

  return {
    db: parsedDb ?? "postgres",
    format: parsedFormat ?? "sql",
    help: false,
    schemaPath,
  };
};

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  process.stdout.write(`${HELP_TEXT}\n`);
  process.exit(0);
}

if (process.stdout.isTTY) {
  render(
    <Generate schemaPath={args.schemaPath} format={args.format} db={args.db} />
  );
} else {
  try {
    const out = await generateText(args.schemaPath, args.format);
    process.stdout.write(out);
    process.exit(0);
  } catch (error) {
    process.stderr.write(`Error: ${String(error)}\n`);
    process.exit(1);
  }
}
