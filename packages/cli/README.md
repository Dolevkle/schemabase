# @schemabase/cli

Command-line interface for Schemabase — generate PostgreSQL schemas from JSON Schema files.

## Installation

### Build from source

```bash
cd packages/cli
bun run build
```

This creates a standalone executable at `./dist/schemabase`.

### Add to PATH

```bash
# Create symlink
mkdir -p ~/.local/bin
ln -sf $(pwd)/dist/schemabase ~/.local/bin/schemabase

# Add to PATH (if not already)
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

## Usage

```
schemabase generate <schema.json> [--format sql|ir|plan] [--db postgres]
```

### Commands

#### `generate`

Generate database schema from a JSON Schema file.

```bash
schemabase generate <schema.json> [options]
```

### Options

| Option     | Description                           | Default    |
| ---------- | ------------------------------------- | ---------- |
| `--format` | Output format: `sql`, `ir`, or `plan` | `sql`      |
| `--db`     | Target database                       | `postgres` |

### Examples

```bash
# Generate SQL (default)
schemabase generate schema.json

# Generate Intermediate Representation
schemabase generate schema.json --format ir

# Generate Migration Plan
schemabase generate schema.json --format plan

# Save to file
schemabase generate schema.json > migration.sql
```

## Output Formats

### SQL (default)

```sql
CREATE TABLE users (
  id UUID NOT NULL PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX users_email_uidx ON users (email);
```

### IR (Intermediate Representation)

JSON representation of the database schema:

```json
{
  "tables": [...],
  "foreignKeys": [],
  "enums": []
}
```

### Plan (Migration Plan)

JSON representation of operations to perform:

```json
{
  "operations": [
    { "type": "CreateTable", ... },
    { "type": "CreateIndex", ... }
  ]
}
```

## Example Schema

Create a file `user.json`:

```json
{
  "$id": "User",
  "type": "object",
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "email": {
      "type": "string",
      "format": "email",
      "x-schemabase": { "unique": true }
    },
    "name": { "type": "string" },
    "createdAt": { "type": "string", "format": "date-time" }
  },
  "required": ["id", "email"]
}
```

Generate SQL:

```bash
schemabase generate user.json
```

## Development

### Build

```bash
bun run build
```

### Test

```bash
bun test
```

## License

MIT
