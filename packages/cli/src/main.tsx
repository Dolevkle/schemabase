#!/usr/bin/env bun
import { Box, Text, render } from "ink";

import {
  Generate,
  generateText,
  type GenerateFormat,
} from "./commands/generate";

const LOGO = [
  "█▀▀ █▀▀█ █  █ █▀▀ █▀▄▀█ █▀▀█ █▀▀▄ █▀▀█ █▀▀ █▀▀",
  "▀▀█ █    █▀▀█ █▀▀ █ ▀ █ █▄▄█ █▀▀▄ █▄▄█ ▀▀█ █▀▀",
  "▀▀▀ ▀▀▀▀ ▀  ▀ ▀▀▀ ▀   ▀ ▀  ▀ ▀▀▀  ▀  ▀ ▀▀▀ ▀▀▀",
] as const;

type ParsedArgs =
  | { help: true }
  | {
      db: "postgres";
      format: GenerateFormat;
      help: false;
      out?: string;
      schemaPath: string;
    };

const HELP_TEXT = [
  ...LOGO,
  "",
  "Usage:",
  "  schemabase generate <path> [--format sql|ir] [--db postgres] [--out file]",
  "",
  "Examples:",
  "  schemabase generate schema.json",
  "  schemabase generate schemas/ --out init.sql",
  "  schemabase generate schema.json --format ir",
  "",
].join("\n");

const isHelp = (cmd: string | undefined) =>
  !cmd || cmd === "-h" || cmd === "--help";

const parseFormat = (v: string | undefined): GenerateFormat | undefined => {
  if (v === "sql" || v === "ir") {
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
  const out = flags.get("--out");

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
    ...(out ? { out } : {}),
    schemaPath,
  };
};

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  process.stdout.write(`${HELP_TEXT}\n`);
  process.exit(0);
}

if (args.out) {
  try {
    const outText = await generateText(args.schemaPath, args.format);
    await Bun.write(args.out, outText);
    process.stdout.write(`Wrote ${args.out}\n`);
    process.exit(0);
  } catch (error) {
    process.stderr.write(`Error: ${String(error)}\n`);
    process.exit(1);
  }
}

if (process.stdout.isTTY) {
  render(
    <Box flexDirection="column">
      <Text>{LOGO.join("\n")}</Text>
      <Text> </Text>
      <Generate
        schemaPath={args.schemaPath}
        format={args.format}
        db={args.db}
      />
    </Box>
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
