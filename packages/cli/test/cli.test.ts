import { describe, expect, test } from "bun:test";

describe("schemabase CLI", () => {
  test("generate outputs SQL by default", async () => {
    const proc = Bun.spawn(
      ["bun", "packages/cli/src/main.tsx", "generate", "packages/core/test/fixtures/simple-user.json"],
      { stdout: "pipe", stderr: "pipe" }
    );
    const out = await new Response(proc.stdout).text();
    const err = await new Response(proc.stderr).text();
    const code = await proc.exited;

    expect(err).toBe("");
    expect(code).toBe(0);
    expect(out).toContain("CREATE TABLE users");
  });

  test("generate --format ir outputs IR JSON", async () => {
    const proc = Bun.spawn(
      [
        "bun",
        "packages/cli/src/main.tsx",
        "generate",
        "packages/core/test/fixtures/simple-user.json",
        "--format",
        "ir"
      ],
      { stdout: "pipe", stderr: "pipe" }
    );
    const out = await new Response(proc.stdout).text();
    const err = await new Response(proc.stderr).text();
    const code = await proc.exited;

    expect(err).toBe("");
    expect(code).toBe(0);
    expect(out).toContain("\"tables\"");
    expect(out).toContain("\"users\"");
  });
});

