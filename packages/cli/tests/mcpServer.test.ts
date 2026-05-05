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
  it("exposes 8 tools", () => {
    expect(_testing.TOOLS).toHaveLength(8);
  });

  it("includes core costscope tools", () => {
    const names = _testing.TOOLS.map((t) => t.name);
    expect(names).toContain("costscope_classify");
    expect(names).toContain("costscope_scope");
    expect(names).toContain("costscope_route");
    expect(names).toContain("costscope_check_diff");
    expect(names).toContain("costscope_cost");
  });

  it("includes handoff tools", () => {
    const names = _testing.TOOLS.map((t) => t.name);
    expect(names).toContain("costscope_handoff");
    expect(names).toContain("costscope_verify");
    expect(names).toContain("costscope_handoff_batch");
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

describe("costscope_handoff", () => {
  it("returns do-it-yourself for a high-risk auth task", async () => {
    const root = await tempProject();
    const result = await callMcpTool("costscope_handoff", {
      task: "Implement OAuth2 login with JWT, update auth middleware and role permissions",
      root
    }) as { verdict: string; tier: string };
    expect(result.verdict).toBe("do-it-yourself");
    expect(result.tier).toBe("premium");
  });

  it("returns run for a simple low-risk task", async () => {
    const root = await tempProject();
    const result = await callMcpTool("costscope_handoff", {
      task: "Update README with installation instructions",
      root
    }) as { verdict: string; tier: string; prompt?: string };
    expect(result.verdict).toBe("run");
    expect(result.prompt).toBeDefined();
    expect(typeof result.prompt).toBe("string");
  });

  it("includes scope in do-it-yourself verdict", async () => {
    const root = await tempProject();
    const result = await callMcpTool("costscope_handoff", {
      task: "Migrate database schema, update migrations and seed data with production keys",
      root
    }) as { verdict: string; scope?: { allowedFiles: string[] } };
    if (result.verdict === "do-it-yourself") {
      expect(result.scope).toBeDefined();
    }
  });
});

describe("costscope_verify", () => {
  it("returns a verdict with changedFiles array", async () => {
    const root = await tempProject();
    const result = await callMcpTool("costscope_verify", { root, tier: "cheap" }) as {
      verdict: string;
      changedFiles: string[];
    };
    expect(["pass", "needs-review", "block"]).toContain(result.verdict);
    expect(Array.isArray(result.changedFiles)).toBe(true);
  });

  it("passes for a clean tree", async () => {
    const root = await tempProject();
    const result = await callMcpTool("costscope_verify", { root }) as { verdict: string };
    expect(result.verdict).toBe("pass");
  });
});

describe("costscope_handoff_batch", () => {
  it("returns a result per task", async () => {
    const root = await tempProject();
    const result = await callMcpTool("costscope_handoff_batch", {
      tasks: ["Update README", "Fix typo in homepage"],
      root
    }) as { results: Array<{ verdict: string; tier: string }> };
    expect(result.results).toHaveLength(2);
    for (const r of result.results) {
      expect(["run", "do-it-yourself"]).toContain(r.verdict);
      expect(["cheap", "balanced", "premium"]).toContain(r.tier);
    }
  });

  it("handles empty task list", async () => {
    const root = await tempProject();
    const result = await callMcpTool("costscope_handoff_batch", { tasks: [], root }) as { results: unknown[] };
    expect(result.results).toHaveLength(0);
  });

  it("routes each task independently", async () => {
    const root = await tempProject();
    const result = await callMcpTool("costscope_handoff_batch", {
      tasks: [
        "Update README with badges",
        "Implement OAuth login with Stripe billing and database migrations"
      ],
      root
    }) as { results: Array<{ verdict: string }> };
    expect(result.results).toHaveLength(2);
    const [easy, hard] = result.results;
    expect(easy!.verdict).toBe("run");
    expect(hard!.verdict).toBe("do-it-yourself");
  });
});
