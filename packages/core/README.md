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
  buildPlan,
  PostgresEmitter,
} from "@schemabase/core";
import { Effect } from "effect";

// Load and compile a schema
const program = Effect.gen(function* () {
  const schema = yield* loadJsonSchemaFile("./user.json");
  const ir = compileJsonSchemaToIR(schema, { file: "./user.json" });
  const plan = buildPlan(ir);
  const sql = PostgresEmitter.emit(plan);
  console.log(sql);
});

Effect.runPromise(program);
```

## API

### Schema Loading

#### `loadJsonSchemaFile(path: string): Effect<JsonSchema, SchemaLoadError>`

Loads and parses a JSON Schema file from disk.

```typescript
import { loadJsonSchemaFile } from "@schemabase/core";
import { Effect } from "effect";

const schema = await Effect.runPromise(loadJsonSchemaFile("./schema.json"));
```

### Compilation

#### `compileJsonSchemaToIR(schema: JsonSchema, opts: CompileOptions): RelationalIR`

Compiles a JSON Schema into a Relational Intermediate Representation (IR).

```typescript
import { compileJsonSchemaToIR } from "@schemabase/core";

const ir = compileJsonSchemaToIR(schema, { file: "./schema.json" });
// Returns: { tables: [...], foreignKeys: [...], enums: [...] }
```

### Plan Building

#### `buildPlan(ir: RelationalIR): MigrationPlan`

Converts an IR into a migration plan with ordered operations.

```typescript
import { buildPlan } from "@schemabase/core";

const plan = buildPlan(ir);
// Returns: { operations: [{ type: "CreateTable", ... }, { type: "CreateIndex", ... }] }
```

### SQL Emission

#### `PostgresEmitter.emit(plan: MigrationPlan): string`

Emits PostgreSQL DDL statements from a migration plan.

```typescript
import { PostgresEmitter } from "@schemabase/core";

const sql = PostgresEmitter.emit(plan);
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
  type: ScalarType; // "uuid" | "text" | "int4" | "float8" | "bool" | "timestamptz"
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

### MigrationPlan

```typescript
interface MigrationPlan {
  operations: Operation[];
}

type Operation = CreateTableOp | CreateIndexOp;

interface CreateTableOp {
  type: "CreateTable";
  table: string;
  columns: Column[];
}

interface CreateIndexOp {
  type: "CreateIndex";
  index: Index;
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
