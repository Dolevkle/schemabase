# @schemabase/core

Core library for converting JSON Schema to PostgreSQL DDL.

## Installation

```bash
bun add @schemabase/core
```

## Usage

```typescript
import {
  loadJsonSchemaFile,
  compileJsonSchemaToIR,
  PostgresEmitter,
} from "@schemabase/core";

// Load and compile a schema
const schema = await loadJsonSchemaFile("./user.json");
const model = await compileJsonSchemaToIR(schema, { file: "./user.json" });
const sql = PostgresEmitter.emit(model);
console.log(sql);
```

## API

### Schema Loading

#### `loadJsonSchemaFile(path: string): Promise<JsonSchema>`

Loads and parses a JSON Schema file from disk.

```typescript
import { loadJsonSchemaFile } from "@schemabase/core";

const schema = await loadJsonSchemaFile("./schema.json");
```

### Compilation

#### `compileJsonSchemaToIR(schema: JsonSchema, opts: CompileOptions): Promise<RelationalIR>`

Compiles a JSON Schema into a Relational Intermediate Representation (IR).

```typescript
import { compileJsonSchemaToIR } from "@schemabase/core";

const ir = await compileJsonSchemaToIR(schema, { file: "./schema.json" });
// Returns: { tables: [...], foreignKeys: [...], enums: [...] }
```

#### `compileJsonSchemasToIR(schemas: Array<{ path: string; schema: JsonSchema }>): Promise<RelationalIR>`

Compile multiple schema files (directory mode). This enables cross-file `$ref` foreign keys:

```typescript
import { compileJsonSchemasToIR, loadJsonSchemaFile } from "@schemabase/core";

const userPath = "/abs/schemas/user.json";
const postPath = "/abs/schemas/post.json";

const model = await compileJsonSchemasToIR([
  { path: userPath, schema: await loadJsonSchemaFile(userPath) },
  { path: postPath, schema: await loadJsonSchemaFile(postPath) },
]);
```

### SQL Emission

#### `PostgresEmitter.emit(model: RelationalIR): string`

Emits PostgreSQL DDL statements from the compiled relational model.

```typescript
import { PostgresEmitter } from "@schemabase/core";

const sql = PostgresEmitter.emit(model);
// Returns SQL string
```

## Types

### JsonSchema

```typescript
interface JsonSchema {
  $id?: string;
  title?: string;
  type?: string | string[];
  format?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  "x-schemabase"?: {
    unique?: boolean;
    index?: boolean;
    table?: string;
    column?: string;
    primaryKey?: string[];
  };
}
```

### RelationalIR

```typescript
interface RelationalIR {
  tables: Table[];
  foreignKeys: ForeignKey[];
  enums: EnumType[];
}

interface Table {
  name: string;
  columns: Column[];
  indexes: Index[];
  provenance: Provenance;
}

interface Column {
  name: string;
  type: {
    jsonType: "string" | "integer" | "number" | "boolean" | "object" | "array";
    format?: string;
    enum?: string[];
    ref?: string;
  };
  nullable: boolean;
  primaryKey?: boolean;
}

interface Index {
  name: string;
  table: string;
  columns: string[];
  unique: boolean;
}
```

## Type Mapping

| JSON Schema Type | Format      | PostgreSQL Type    |
| ---------------- | ----------- | ------------------ |
| `string`         | —           | `TEXT`             |
| `string`         | `uuid`      | `UUID`             |
| `string`         | `date-time` | `TIMESTAMPTZ`      |
| `integer`        | —           | `INTEGER`          |
| `number`         | —           | `DOUBLE PRECISION` |
| `boolean`        | —           | `BOOLEAN`          |

## Naming Utilities

```typescript
import {
  toSnakeCase,
  pluralize,
  defaultTableNameFromIdOrTitle,
} from "@schemabase/core";

toSnakeCase("createdAt"); // "created_at"
pluralize("user"); // "users"
defaultTableNameFromIdOrTitle("BlogPost"); // "blog_posts"
```

## License

MIT
