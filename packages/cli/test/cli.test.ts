import { describe, expect, test } from "bun:test";

describe("schemabase CLI", () => {
  test("generate outputs SQL by default", async () => {
    const proc = Bun.spawn(
      [
        "bun",
        "packages/cli/src/main.tsx",
        "generate",
        "packages/core/test/fixtures/simple-user.json",
      ],
      { stderr: "pipe", stdout: "pipe" }
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
        "ir",
      ],
      { stderr: "pipe", stdout: "pipe" }
    );
    const out = await new Response(proc.stdout).text();
    const err = await new Response(proc.stderr).text();
    const code = await proc.exited;

    expect(err).toBe("");
    expect(code).toBe(0);
    expect(out).toContain('"tables"');
    expect(out).toContain('"users"');
  });

  test("generate directory --out writes file", async () => {
    const dir = `${process.cwd()}/.tmp/schemabase-cli-test/${crypto.randomUUID()}`;
    await Bun.$`mkdir -p ${dir}`;
    const outPath = `${dir}/init.sql`;

    await Bun.write(
      `${dir}/user.json`,
      `${JSON.stringify(
        {
          $id: "User",
          properties: { id: { format: "uuid", type: "string" } },
          required: ["id"],
          type: "object",
        },
        null,
        2
      )}\n`
    );
    await Bun.write(
      `${dir}/post.json`,
      `${JSON.stringify(
        {
          $id: "Post",
          properties: {
            authorId: { $ref: "./user.json" },
            id: { format: "uuid", type: "string" },
          },
          required: ["id", "authorId"],
          type: "object",
        },
        null,
        2
      )}\n`
    );

    const proc = Bun.spawn(
      ["bun", "packages/cli/src/main.tsx", "generate", dir, "--out", outPath],
      { stderr: "pipe", stdout: "pipe" }
    );
    const out = await new Response(proc.stdout).text();
    const err = await new Response(proc.stderr).text();
    const code = await proc.exited;

    expect(err).toBe("");
    expect(code).toBe(0);
    expect(out).toContain("Wrote");

    const fileText = await Bun.file(outPath).text();
    expect(fileText).toContain("CREATE TABLE users");
    expect(fileText).toContain("ALTER TABLE posts ADD CONSTRAINT");
  });
});
