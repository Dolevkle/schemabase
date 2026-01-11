#!/usr/bin/env bun
import React from "react";
import { render } from "ink";
import { Generate, generateText, type GenerateFormat } from "./commands/generate";

function parseArgs(argv: string[]) {
  const [cmd, schemaPath, ...rest] = argv;
  if (!cmd || cmd === "-h" || cmd === "--help") return { help: true as const };
  if (cmd !== "generate") return { help: true as const };
  if (!schemaPath) return { help: true as const };

  let format: GenerateFormat = "sql";
  let db: "postgres" = "postgres";

  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]!;
    if (a === "--format") {
      const v = rest[i + 1];
      if (v === "sql" || v === "ir" || v === "plan") {
        format = v;
        i++;
        continue;
      }
      return { help: true as const };
    }
    if (a === "--db") {
      const v = rest[i + 1];
      if (v === "postgres") {
        db = v;
        i++;
        continue;
      }
      return { help: true as const };
    }
  }

  return { help: false as const, schemaPath, format, db };
}

function help() {
  return [
    "schemabase",
    "",
    "Usage:",
    "  schemabase generate <schema.json> [--format sql|ir|plan] [--db postgres]",
    "",
    "Examples:",
    "  schemabase generate schema.json",
    "  schemabase generate schema.json --format ir",
    "  schemabase generate schema.json --format plan",
    ""
  ].join("\n");
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  // eslint-disable-next-line no-console
  console.log(help());
  process.exit(1);
}

if (!process.stdout.isTTY) {
  try {
    const out = await generateText(args.schemaPath, args.format);
    process.stdout.write(out);
    process.exit(0);
  } catch (e) {
    process.stderr.write(`Error: ${String(e)}\n`);
    process.exit(1);
  }
} else {
  render(<Generate schemaPath={args.schemaPath} format={args.format} db={args.db} />);
}

