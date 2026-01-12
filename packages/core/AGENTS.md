# @schemabase/core — Agent Notes

## What this package does

Transforms JSON Schema into a DB-agnostic relational model (tables, columns, FKs, indexes, enums), then emits SQL via dialect emitters (Phase 1: Postgres).

## Key files

- `src/schema/`
  - `types.ts`: JSON Schema types + `x-schemabase` extensions
  - `resolver.ts`: normalize + inline local `$ref`; preserve cross-file `$ref` for FK inference
- `src/compile/`
  - `compile.ts`: main compiler (`compileJsonSchemaToIR`, `compileJsonSchemasToIR`)
  - `registry.ts`: schema registry for multi-file FK PK-type resolution
  - `inference.ts`: enum inference (from column enums)
- `src/emitters/postgres.ts`: SQL emission (two pass: create tables, then add FKs)

## Invariants

- One input file produces exactly one table in `compileJsonSchemaToIR`.
- Cross-file `$ref` becomes:
  - a FK column (`*_id` naming) with `type.ref` set
  - a `foreignKeys[]` entry when compiled in multi-file mode (registry available)
- Local `$ref` (`#/$defs/*`) is inlined by resolver and treated as nested (JSONB) if object/array.

## How to test

- `bun test packages/core/test/compile.test.ts`
- `bun test packages/core/test/postgres.test.ts`
