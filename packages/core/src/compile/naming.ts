const normalizeSeparators = (input: string) =>
  input.trim().replaceAll(/[ .-]+/g, "_");

const insertUnderscoresForCaseChanges = (input: string) =>
  input.replaceAll(/([a-z0-9])([A-Z])/g, "$1_$2");

export const toSnakeCase = (input: string): string =>
  normalizeSeparators(insertUnderscoresForCaseChanges(input))
    .toLowerCase()
    .replaceAll(/_+/g, "_");

export const pluralize = (name: string): string => {
  const n = name.toLowerCase();
  return n.endsWith("s") ? n : `${n}s`;
};

export const defaultTableNameFromIdOrTitle = (
  idOrTitle: string,
  opts?: { pluralize?: boolean }
): string => {
  const snake = toSnakeCase(idOrTitle);
  return opts?.pluralize === false ? snake : pluralize(snake);
};
