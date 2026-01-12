# Schemabase

Generate PostgreSQL schemas from JSON Schema definitions.

## Features

- **JSON Schema → PostgreSQL** — Define data models using JSON Schema, generate SQL
- **Automatic type mapping** — JSON Schema types convert to appropriate PostgreSQL types
- **Index support** — Define unique and regular indexes via `x-schemabase` extensions
- **Standalone CLI** — Single executable, no runtime dependencies

## Quick Start

### 1. Install

```bash
# Clone and build
git clone https://github.com/your-org/schemabase.git
cd schemabase
bun install
cd packages/cli && bun run build

# Add to PATH
ln -sf $(pwd)/dist/schemabase ~/.local/bin/schemabase
```

### 2. Create a schema

```json
{
  "$id": "User",
  "type": "object",
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "email": {
      "type": "string",
      "x-schemabase": { "unique": true }
    },
    "name": { "type": "string" },
    "createdAt": { "type": "string", "format": "date-time" }
  },
  "required": ["id", "email"]
}
```

### 3. Generate SQL

```bash
schemabase generate user.json
```

```sql
CREATE TABLE users (
  id UUID NOT NULL PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX users_email_uidx ON users (email);
```

## CLI Usage

```bash
schemabase generate <path> [--format sql|ir] [--db postgres] [--out file]
```

| Option     | Values      | Default |
| ---------- | ----------- | ------- |
| `--format` | `sql`, `ir` | `sql`   |
| `--out`    | file path   | stdout  |

`<path>` can be a single schema file or a directory containing `.json` schema files.

## Relationships

- **Cross-file `$ref`**: treated as a foreign key referencing the target table's primary key.
  - Example: `"authorId": { "$ref": "./user.json" }` becomes `author_id` referencing `users(id)`.
  - Custom PKs are supported: if `user.json` has `"x-schemabase": { "primaryKey": ["code"] }`, the FK references `users(code)`.
- **1:1**: add `"x-schemabase": { "unique": true }` on the `$ref` property.
- **N:M**: create an explicit junction schema and set `"x-schemabase": { "primaryKey": ["userId","tagId"] }`.

## Nested objects

Nested `object` / `array` properties are stored as `JSONB` in Postgres.

## Type Mapping

| JSON Schema | Format      | PostgreSQL         |
| ----------- | ----------- | ------------------ |
| `string`    | —           | `TEXT`             |
| `string`    | `uuid`      | `UUID`             |
| `string`    | `date-time` | `TIMESTAMPTZ`      |
| `integer`   | —           | `INTEGER`          |
| `number`    | —           | `DOUBLE PRECISION` |
| `boolean`   | —           | `BOOLEAN`          |

## Schema Extensions

Use `x-schemabase` to configure database-specific features:

```json
{
  "email": {
    "type": "string",
    "x-schemabase": { "unique": true }
  }
}
```

| Extension    | Description                   |
| ------------ | ----------------------------- |
| `unique`     | Create unique index           |
| `index`      | Create non-unique index       |
| `column`     | Override column name          |
| `table`      | Override table name (on root) |
| `primaryKey` | Composite primary key (root)  |

## Packages

| Package                             | Description                                              |
| ----------------------------------- | -------------------------------------------------------- |
| [@schemabase/core](./packages/core) | Core library — schema loading, compilation, SQL emission |
| [@schemabase/cli](./packages/cli)   | Command-line interface                                   |

## Development

```bash
bun install          # Install dependencies
bun test             # Run tests
bun run lint         # Lint code
bun run typecheck    # Type check
bun run ci           # Run all checks
```

## License

MIT
