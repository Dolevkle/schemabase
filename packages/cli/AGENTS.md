# @schemabase/cli — Agent Notes

## What this package does

Ink-based CLI wrapper around `@schemabase/core`.

Primary command:

- `schemabase generate <path> [--format sql|ir] [--db postgres] [--out file]`

Where `<path>` can be:

- a single schema file, or
- a directory of schema files

## Key files

- `src/main.tsx`: argument parsing, help output, TTY vs non-TTY behavior, `--out`
- `src/commands/generate.tsx`: loads schemas, calls compiler, prints SQL/IR
- `test/cli.test.ts`: e2e tests (spawn `bun packages/cli/src/main.tsx ...`)

## Behaviors to preserve

- Non-TTY stdout should output only machine-readable content (SQL/IR).
- Directory mode should ignore fixture outputs like `*.ir.json` / `expected.ir.json`.
