function isUpper(ch: string) {
  return ch >= "A" && ch <= "Z";
}

export function toSnakeCase(input: string): string {
  const s = input.trim();
  if (s.length === 0) return s;

  let out = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    const prev = i > 0 ? s[i - 1]! : "";
    if (ch === " " || ch === "-" || ch === ".") {
      if (!out.endsWith("_")) out += "_";
      continue;
    }
    if (isUpper(ch) && i > 0 && prev !== "_" && !isUpper(prev)) {
      out += "_";
    }
    out += ch.toLowerCase();
  }
  return out.replace(/_+/g, "_");
}

export function pluralize(name: string): string {
  const n = name.toLowerCase();
  if (n.endsWith("s")) return n;
  return `${n}s`;
}

export function defaultTableNameFromIdOrTitle(
  idOrTitle: string,
  opts?: { pluralize?: boolean }
): string {
  const snake = toSnakeCase(idOrTitle);
  return opts?.pluralize === false ? snake : pluralize(snake);
}

