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
schemabase generate <path> [--format sql|ir] [--db postgres] [--out file]
```

### Commands

#### `generate`

Generate database schema from a JSON Schema file.

```bash
schemabase generate <path> [options]
```

### Options

| Option     | Description                           | Default    |
| ---------- | ------------------------------------- | ---------- |
| `--format` | Output format: `sql` or `ir`          | `sql`      |
| `--db`     | Target database                       | `postgres` |
| `--out`    | Write output to file (instead stdout) | stdout     |

### Examples

```bash
# Generate SQL (default)
schemabase generate schema.json

# Generate Intermediate Representation
schemabase generate schema.json --format ir

# Generate all schemas in a directory
schemabase generate schemas/

# Save to file
schemabase generate schemas/ --out init.sql
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
