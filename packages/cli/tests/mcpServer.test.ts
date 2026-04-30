// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execa } from "execa";
import { callMcpTool, _testing } from "../src/commands/mcpServer.js";

async function tempProject(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "costscope-mcp-"));
  await writeFile(join(dir, "package.json"), JSON.stringify({ name: "x", version: "1.0.0" }), "utf8");
  await execa("git", ["init"], { cwd: dir });
  await execa("git", ["config", "user.email", "t@t"], { cwd: dir });
  await execa("git", ["config", "user.name", "t"], { cwd: dir });
  await execa("git", ["add", "."], { cwd: dir });
  await execa("git", ["commit", "-m", "init"], { cwd: dir });
  return dir;
}

describe("mcpServer tool list", () => {
  it("exposes 5 tools", () => {
    expect(_testing.TOOLS).toHaveLength(5);
  });

  it("includes core costscope tools", () => {
    const names = _testing.TOOLS.map((t) => t.name);
    expect(names).toContain("costscope_classify");
    expect(names).toContain("costscope_scope");
    expect(names).toContain("costscope_route");
    expect(names).toContain("costscope_check_diff");
    expect(names).toContain("costscope_cost");
  });
});

describe("callMcpTool", () => {
  it("classifies a simple task", async () => {
    const result = await callMcpTool("costscope_classify", { task: "update README" });
    expect((result as { risk: string }).risk).toBe("low");
  });

  it("estimates cost for premium tier", async () => {
    const result = await callMcpTool("costscope_cost", { tier: "premium" });
    expect((result as { tier: string }).tier).toBe("premium");
  });

  it("scopes a task in a real project", async () => {
    const root = await tempProject();
    const result = await callMcpTool("costscope_scope", { task: "update readme", root });
    expect(result).toBeDefined();
    expect(Array.isArray((result as { allowedFiles: string[] }).allowedFiles)).toBe(true);
  });

  it("routes a task to a tier", async () => {
    const root = await tempProject();
    const result = await callMcpTool("costscope_route", { task: "fix typo", root });
    const r = result as { route: { tier: string } };
    expect(["cheap", "balanced", "premium"]).toContain(r.route.tier);
  });

  it("throws on unknown tool", async () => {
    await expect(callMcpTool("nonexistent", {})).rejects.toThrow();
  });
});
