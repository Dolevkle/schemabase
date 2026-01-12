---
name: Phase 1 Completion
overview: "Complete Phase 1: One JSON file = one table. Cross-file $ref = FK with relationship support (1:1, 1:N, N:M). Nested objects = JSONB. CLI supports single file and directory."
todos:
  - id: add-resolver
    content: Create packages/core/src/schema/resolver.ts with $ref/$defs resolution
    status: completed
  - id: update-ir-types
    content: Simplify IR types - preserve JSON Schema types instead of semantic types
    status: completed
  - id: add-inference
    content: Create packages/core/src/compile/inference.ts for FK, enum, and relationship detection
    status: completed
  - id: update-compiler
    content: Update compile.ts to use resolver and new types
    status: completed
  - id: update-postgres-emitter
    content: Move all type mapping to postgres.ts emitter
    status: completed
  - id: remove-plan-layer
    content: Remove or simplify the plan/ directory
    status: completed
  - id: add-cli-logo
    content: Add ASCII schemabase logo to CLI
    status: completed
  - id: add-ci
    content: CI pipeline already exists at .github/workflows/ci.yml
    status: completed
  - id: add-tests
    content: Add test fixtures and golden tests for refs, enums, relationships
    status: completed
  - id: one-table-per-file
    content: Refactor to one JSON file = one table architecture, cross-file $ref for FKs
    status: completed
  - id: relationship-support
    content: Add 1:1 (unique FK), 1:N (FK), and N:M (junction table with composite PK) support
    status: completed
  - id: schema-registry
    content: Create schema registry for multi-file compilation with FK type resolution
    status: completed
  - id: cli-updates
    content: Update CLI - remove plan format, add directory support, add --out flag, update help text
    status: completed
  - id: update-root-readme
    content: Update root README.md with new architecture and examples
    status: completed
  - id: update-core-readme
    content: Update packages/core/README.md with new API and examples
    status: completed
  - id: update-cli-readme
    content: Update packages/cli/README.md with directory support examples
    status: completed
---

# Phase 1 Completion - Simplified Architecture

## Core Design Principle: One Table Per File

Each JSON Schema file represents exactly **one database table**. This provides:

- Clear single responsibility - `user.json` = users table
- Better version control - changes isolated per table
- Easier team collaboration - fewer merge conflicts
- Intuitive file structure - file names = table names

## Architecture

```
schemas/
├── user.json      → users table
├── post.json      → posts table (FK to user.json)
└── comment.json   → comments table (FK to post.json, user.json)
```

Pipeline:

```
JSON Schema Files → Resolver → Relational Model → SQL Emitter
```

## Type Mapping Rules

### Scalar Types → SQL Types

| JSON Schema | Format | PostgreSQL |

|-------------|--------|------------|

| `string` | — | `TEXT` |

| `string` | `uuid` | `UUID` |

| `string` | `date-time` | `TIMESTAMPTZ` |

| `integer` | — | `INTEGER` |

| `number` | — | `DOUBLE PRECISION` |

| `boolean` | — | `BOOLEAN` |

### Relationships via Cross-File $ref

#### One-to-Many (1:N) - User has many Posts

```json
// post.json
{
  "$id": "Post",
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "authorId": { "$ref": "./user.json" }, // FK to users(id)
    "title": { "type": "string" }
  }
}
```

SQL Output:

```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY,
  author_id UUID REFERENCES users(id),
  title TEXT
);
```

#### One-to-One (1:1) - User has one Profile

```json
// profile.json
{
  "$id": "Profile",
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "userId": {
      "$ref": "./user.json",
      "x-schemabase": { "unique": true } // UNIQUE constraint = 1:1
    },
    "bio": { "type": "string" }
  }
}
```

SQL Output:

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES users(id),
  bio TEXT
);
```

#### Many-to-Many (N:M) - Users and Tags via Junction Table

```json
// user_tag.json (junction table)
{
  "$id": "UserTag",
  "properties": {
    "userId": { "$ref": "./user.json" },
    "tagId": { "$ref": "./tag.json" }
  },
  "x-schemabase": {
    "primaryKey": ["userId", "tagId"] // Composite PK
  }
}
```

SQL Output:

```sql
CREATE TABLE user_tags (
  user_id UUID REFERENCES users(id),
  tag_id UUID REFERENCES tags(id),
  PRIMARY KEY (user_id, tag_id)
);
```

### Nested Objects = JSONB (Simple Approach)

Any nested object (whether from `$defs` or inline) becomes a `JSONB` column:

```json
// user.json
{
  "$id": "User",
  "properties": {
    "name": { "type": "string" },
    "settings": {
      "type": "object",
      "properties": { "theme": { "type": "string" } }
    }
  }
}
```

Result: `settings JSONB` column. This keeps things simple - no complex flattening logic.

## Completed Changes

### 1. Schema Layer - $ref Resolution (DONE)

[`packages/core/src/schema/resolver.ts`](packages/core/src/schema/resolver.ts):

- Resolve local `$ref` (`#/$defs/X`) by inlining
- Preserve cross-file `$ref` (`./user.json`) for FK inference

### 2. IR/Model Layer (DONE)

[`packages/core/src/ir/types.ts`](packages/core/src/ir/types.ts):

- Preserve JSON Schema types (`jsonType`, `format`)
- Track `ref` for FK inference

### 3. Compile Layer (DONE)

[`packages/core/src/compile/compile.ts`](packages/core/src/compile/compile.ts):

- One file = one table (root object only)
- FK inference from cross-file `$ref`

### 4. Emitter Layer (DONE)

[`packages/core/src/emitters/postgres.ts`](packages/core/src/emitters/postgres.ts):

- All type mapping happens here
- Handle FK constraints

### 5. Plan Layer Removed (DONE)

### 6. CLI Logo (DONE)

### 7. Tests (DONE)

## Remaining Work

### 8. Enforce One-Table-Per-File + Relationships + JSONB

Update [`packages/core/src/compile/compile.ts`](packages/core/src/compile/compile.ts):

- One file = one table (process root object only)
- Cross-file `$ref` → Foreign key constraint
- `$ref` + `x-schemabase.unique` → 1:1 relationship (UNIQUE FK)
- `x-schemabase.primaryKey: [...]` → Composite primary key (for junction tables)
- Nested objects (`type: "object"`) → JSONB column
- Local `$ref` (`#/$defs/X`) → Resolve and treat as nested object → JSONB

**FK Type Resolution (Best DX):**

- Build schema registry first (scan all files in directory)
- When encountering `$ref: "./user.json"`, look up user.json's `id` property type
- Use that type for the FK column (works with UUID, INTEGER, etc.)
- Convention: PK is always the `id` property

Update [`packages/core/src/emitters/postgres.ts`](packages/core/src/emitters/postgres.ts):

**Two-pass SQL generation (handles circular refs):**

1. Pass 1: Emit `CREATE TABLE` with columns but NO FK constraints
2. Pass 2: Emit `ALTER TABLE ADD CONSTRAINT` for all FKs

This handles:

- Self-references (user.managerId → users)
- Mutual references (A → B, B → A)
- No topological sort needed - order doesn't matter

Additional:

- Emit `UNIQUE` constraint for 1:1 relationships
- Emit composite `PRIMARY KEY (col1, col2)` for junction tables
- FK column type matches referenced table's PK type

### 9. CLI Updates

Update [`packages/cli/src/main.tsx`](packages/cli/src/main.tsx):

#### Updated Command Syntax

```
schemabase generate <path> [options]
```

Where `<path>` can be:

- Single file: `user.json`
- Directory: `schemas/` (processes all `.json` files)

#### Updated Flags

| Flag | Values | Default | Description |

|------|--------|---------|-------------|

| `--format` | `sql`, `ir` | `sql` | Output format |

| `--db` | `postgres` | `postgres` | Target database |

| `--out` | `<file>` | stdout | Output file (optional) |

**Removed:** `--format plan` (Plan layer removed)

#### Updated Help Text

```
█▀▀ █▀▀█ █  █ █▀▀ █▀▄▀█ █▀▀█ █▀▀▄ █▀▀█ █▀▀ █▀▀
▀▀█ █    █▀▀█ █▀▀ █ ▀ █ █▄▄█ █▀▀▄ █▄▄█ ▀▀█ █▀▀
▀▀▀ ▀▀▀▀ ▀  ▀ ▀▀▀ ▀   ▀ ▀  ▀ ▀▀▀  ▀  ▀ ▀▀▀ ▀▀▀

Generate PostgreSQL schemas from JSON Schema definitions.

Usage:
  schemabase generate <path> [--format sql|ir] [--db postgres] [--out file]

Arguments:
  <path>    JSON schema file or directory of schema files

Options:
  --format  Output format: sql (default), ir
  --db      Target database: postgres (default)
  --out     Write output to file instead of stdout

Examples:
  schemabase generate user.json              # Single table
  schemabase generate schemas/               # All tables in directory
  schemabase generate schemas/ --out init.sql
```

#### Processing Logic

**Single file mode:**

- Load and compile single schema
- Cross-file `$ref` will error (no registry)

**Directory mode:**

- Scan all `.json` files in directory
- Build schema registry for FK type resolution
- Two-pass SQL output (CREATE TABLE, then ALTER TABLE for FKs)

#### Implementation Changes

1. Detect if path is file or directory
2. For directory: use `fs.readdir()` to get all `.json` files
3. Build `SchemaRegistry: Map<string, JsonSchema>`
4. Pass registry to compiler for FK type lookups
5. Remove `plan` format option and related code

### 10. Update README Files

**Root README.md:**

- Document one-table-per-file convention
- Explain nested objects → JSONB behavior
- Add multi-file example with relationships
- Update CLI usage: `schemabase generate <path>` (file or directory)
- Remove `--format plan` from examples

**packages/core/README.md:**

- Document type mapping (scalar → SQL, nested → JSONB)
- Document `$ref` behavior (cross-file = FK)
- Update API examples for multi-file compilation
- Remove references to Plan layer
- Add SchemaRegistry documentation

**packages/cli/README.md:**

- Update command syntax: `<path>` instead of `<schema.json>`
- Remove `--format plan` option
- Add `--out` flag documentation
- Add directory processing examples
- Document two-pass SQL output structure
- Update example output to show ALTER TABLE for FKs

## Test Fixtures

Update fixtures to follow one-table-per-file:

- `fixtures/user.json` - single user table with scalar columns
- `fixtures/post.json` - 1:N relationship (`$ref: "./user.json"` FK)
- `fixtures/profile.json` - 1:1 relationship (unique FK)
- `fixtures/tag.json` - simple tag table
- `fixtures/user_tag.json` - N:M junction table (composite PK)
- `fixtures/with-nested.json` - nested objects → JSONB columns
- `fixtures/with-enums.json` - enum types
