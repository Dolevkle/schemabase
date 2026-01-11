export type JsonSchema = {
  $id?: string;
  title?: string;
  description?: string;
  $ref?: string;
  type?: string | string[];
  format?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  enum?: string[];
  items?: JsonSchema;
  definitions?: Record<string, JsonSchema>;
  $defs?: Record<string, JsonSchema>;
  // extension point
  "x-schemabase"?: {
    unique?: boolean;
    index?: boolean;
    table?: string;
    column?: string;
  };
  [key: string]: unknown;
};

