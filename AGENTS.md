# Schemabase — Agent Notes

This file is for AI coding agents working in this repo. Prefer the simplest change that keeps `bun run ci` green.

## Repo layout

- `packages/core/`: compiler + emitter library
- `packages/cli/`: Ink-based CLI (`schemabase generate`)

## Core design rules

- **One schema file = one table**
  - A single JSON Schema file compiles into exactly one table.
- **Cross-file `$ref` = foreign key**
  - Example: `"authorId": { "$ref": "./user.json" }` becomes `author_id` referencing `users(id)`.
  - `x-schemabase.unique: true` on the `$ref` property means **1:1** (unique index on FK column).
- **Nested `object`/`array` = JSONB** (Postgres)
  - Nested shapes stay in a single column rather than being flattened into separate tables.
- **No redundant validation**
  - JSON Schema is the source of truth for shape. Avoid “re-validating” by re-encoding rules elsewhere.

## Commands (run from repo root)

- **tests**: `bun test`
- **typecheck**: `bun run typecheck`
- **lint**: `bun run lint`
- **all**: `bun run ci`

## Coding conventions

- TypeScript ESM (`"type": "module"`). Keep types precise (this repo uses `exactOptionalPropertyTypes`).
- **Do not use Node internals**: never import Node builtins via `node:*` (e.g. `node:fs/promises`, `node:path`). Use Bun APIs (`Bun.Glob`, `Bun.$`, `Bun.file`, `Bun.write`) instead.
- Prefer pure functions and clear naming; keep compiler/emitter deterministic.
- Avoid introducing new dependencies unless required.

## CLI behavior

- `schemabase generate <path>` accepts:
  - a single `.json` schema file, or
  - a directory of `.json` schema files
- `--format`: `sql` or `ir`
- `--out <file>`: writes output to file and prints a short confirmation.

## Lint/format

- Lint is intentionally scoped (see root `package.json`) and should pass in CI.
