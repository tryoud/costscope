// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SlashRegistry } from "../src/slash/registry.js";
import { registerBuiltinSlashCommands } from "../src/slash/builtin.js";

async function tempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "costscope-slash-"));
}

describe("SlashRegistry", () => {
  it("parses /name args correctly", () => {
    const r = new SlashRegistry();
    expect(r.parse("/foo bar baz")).toEqual({ name: "foo", args: "bar baz" });
  });

  it("returns undefined for non-slash input", () => {
    const r = new SlashRegistry();
    expect(r.parse("hello")).toBeUndefined();
  });

  it("returns undefined for empty slash", () => {
    const r = new SlashRegistry();
    expect(r.parse("/")).toBeUndefined();
  });

  it("registers and executes a command", async () => {
    const r = new SlashRegistry();
    r.register({
      name: "echo",
      description: "echo args",
      handler: (args) => ({ output: `got: ${args}` })
    });
    const result = await r.execute("/echo hello", { rootPath: "/", homeDir: "/" });
    expect(result?.output).toBe("got: hello");
  });

  it("returns 'Unknown slash command' for unregistered name", async () => {
    const r = new SlashRegistry();
    const result = await r.execute("/nope", { rootPath: "/", homeDir: "/" });
    expect(result?.output).toContain("Unknown slash command");
  });

  it("list returns all commands sorted by name", () => {
    const r = new SlashRegistry();
    r.register({ name: "z", description: "", handler: () => ({ output: "" }) });
    r.register({ name: "a", description: "", handler: () => ({ output: "" }) });
    expect(r.list().map((c) => c.name)).toEqual(["a", "z"]);
  });
});

describe("registerBuiltinSlashCommands", () => {
  it("registers help, exit, skills, prompts, sessions", () => {
    const r = new SlashRegistry();
    registerBuiltinSlashCommands(r);
    const names = r.list().map((c) => c.name);
    expect(names).toContain("help");
    expect(names).toContain("exit");
    expect(names).toContain("skills");
    expect(names).toContain("prompts");
    expect(names).toContain("sessions");
  });

  it("/help lists registered commands", async () => {
    const r = new SlashRegistry();
    registerBuiltinSlashCommands(r);
    const result = await r.execute("/help", { rootPath: await tempDir(), homeDir: await tempDir() });
    expect(result?.output).toContain("/help");
  });

  it("/exit signals exit", async () => {
    const r = new SlashRegistry();
    registerBuiltinSlashCommands(r);
    const result = await r.execute("/exit", { rootPath: "/", homeDir: "/" });
    expect(result?.exit).toBe(true);
  });
});
