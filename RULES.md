# Schemabase repo rules

## Bun-first (no Node internals)

This codebase is **Bun-first**.

- **Never import Node builtins via `node:*`**.
  - Forbidden examples:
    - `import { mkdir } from "node:fs/promises"`
    - `import path from "node:path"`
    - `import fs from "node:fs"`
- Prefer Bun-native APIs:
  - `Bun.Glob` for directory scanning
  - `Bun.$\`...\``for simple shell operations (e.g.`mkdir -p`)
  - `Bun.file(...)` / `Bun.write(...)` for IO

## Architecture invariants

- **One JSON Schema file = one table**
- **Cross-file `$ref` = foreign key**
  - `x-schemabase.unique: true` on a `$ref` field indicates **1:1**
- **Nested objects/arrays = JSONB** (Postgres)
- JSON Schema is the **source of truth**; avoid duplicating validation rules elsewhere.

## Quality bar

- Keep `bun run ci` green.
