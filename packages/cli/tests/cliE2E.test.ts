// SPDX-License-Identifier: Apache-2.0

import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execa } from "execa";
import { describe, expect, it } from "vitest";
import { checkDiffCommand } from "../src/commands/checkDiff.js";
import { autopilotCommand } from "../src/commands/autopilot.js";
import { classifyCommand } from "../src/commands/classify.js";
import { guardCommand } from "../src/commands/guard.js";
import { orchestrateCommand } from "../src/commands/orchestrate.js";
import { planCommand } from "../src/commands/plan.js";
import { promptCommand } from "../src/commands/prompt.js";
import { runCommand } from "../src/commands/run.js";
import { scanCommand } from "../src/commands/scan.js";
import { scopeCommand } from "../src/commands/scope.js";

describe("CLI command e2e", () => {
  it("runs scan -> classify -> scope -> prompt -> check-diff for an allowed README change", async () => {
    const root = await createGitFixture();

    const scan = await scanCommand({ root });
    const classification = await classifyCommand("Update README docs", { root });
    const scoped = await scopeCommand("Update README docs", { root });
    const prompt = await promptCommand("Update README docs", { root });
    await writeFile(path.join(root, "README.md"), "# Fixture\n\nUpdated.\n");
    const diff = await checkDiffCommand({ root, tier: "cheap" });

    expect(scan.projectType).toBe("node");
    expect(classification.tier).toBe("cheap");
    expect(scoped.fileScope.allowedFiles).toContain("README.md");
    expect(prompt.prompt).toContain("Change only allowed files.");
    expect(diff.verdict).toBe("pass");
  });

  it("blocks .env changes", async () => {
    const root = await createGitFixture();
    await scopeCommand("Update README docs", { root });
    await writeFile(path.join(root, ".env"), "SECRET=do-not-read\n");

    const diff = await checkDiffCommand({ root, tier: "cheap" });

    expect(diff.verdict).toBe("block");
    expect(diff.forbiddenTouched).toContain(".env");
  });

  it("blocks package.json in cheap mode", async () => {
    const root = await createGitFixture();
    await scopeCommand("Update package docs", { root });
    await writeFile(path.join(root, "package.json"), "{\"name\":\"fixture\",\"description\":\"changed\"}\n");

    const diff = await checkDiffCommand({ root, tier: "cheap" });

    expect(diff.verdict).toBe("block");
    expect(diff.forbiddenTouched).toContain("package.json");
  });

  it("marks maybe-file changes as needs-review", async () => {
    const root = await createGitFixture();
    await writeFile(path.join(root, ".costscope", "last-scope.json"), JSON.stringify({
      fileScope: {
        allowedFiles: ["README.md"],
        maybeFiles: ["src/**"],
        forbiddenFiles: [".env", ".env.*", "**/*.pem", "**/*.key"],
        reason: ["fixture"]
      }
    }));
    await writeFile(path.join(root, "src", "Maybe.ts"), "export const maybe = true;\n");

    const diff = await checkDiffCommand({ root, tier: "balanced" });

    expect(diff.verdict).toBe("needs-review");
    expect(diff.outOfScopeFiles).toEqual([]);
  });

  it("plans a run without executing a worker in dry-run mode", async () => {
    const root = await createGitFixture();

    const result = await runCommand("Update README docs", { root, dryRun: true });

    expect(result.mode).toBe("dry-run");
    expect(result.route.tier).toBe("cheap");
    expect(result.provider.executor).toBe("aider");
    expect(result.workerPrompt.prompt).toContain("Change only allowed files.");
  });

  it("requires confirmation before running routes that are not auto-run safe", async () => {
    const root = await createGitFixture();

    await expect(runCommand("Refactor the app architecture", { root })).rejects.toThrow("Auto-run is not allowed");
  });

  it("plans a larger goal as scoped mini-tasks", async () => {
    const root = await createGitFixture();

    const result = await planCommand("Build landing page with hero and FAQ", { root });

    expect(result.tasks.length).toBeGreaterThan(1);
    expect(result.tasks.at(-1)?.dependsOn.length).toBeGreaterThan(0);
  });

  it("builds orchestration batches without executing workers by default", async () => {
    const root = await createGitFixture();

    const result = await orchestrateCommand("Build landing page with hero and FAQ", { root });

    expect(result.mode).toBe("orchestrate-dry-run");
    expect(result.batches.length).toBeGreaterThan(0);
    expect(result.reason[0]).toContain("--execute");
  });

  it("previews autopilot without executing workers in dry-run mode", async () => {
    const root = await createGitFixture();

    const result = await autopilotCommand("Build landing page with hero and FAQ", { root, dryRun: true });

    expect(result.mode).toBe("autopilot-dry-run");
    expect(result.batches.length).toBeGreaterThan(0);
    expect(result.reason[0]).toContain("Autopilot would run");
  });

  it("refuses autopilot when the working tree is dirty", async () => {
    const root = await createGitFixture();
    await writeFile(path.join(root, "README.md"), "# Fixture\n\nDirty.\n");

    await expect(autopilotCommand("Update README docs", { root })).rejects.toThrow("Working tree is not clean");
  });

  it("fails the CI guard when a diff is blocked", async () => {
    const root = await createGitFixture();
    await scopeCommand("Update README docs", { root });
    await writeFile(path.join(root, ".env"), "SECRET=do-not-read\n");

    const result = await guardCommand({ root, tier: "cheap" });

    expect(result.passed).toBe(false);
    expect(result.diffResult.verdict).toBe("block");
  });

  it("runs the CI guard without a last scope file by checking global forbidden files", async () => {
    const root = await createGitFixture();
    await writeFile(path.join(root, ".env"), "SECRET=do-not-read\n");

    const result = await guardCommand({ root, tier: "cheap" });

    expect(result.passed).toBe(false);
    expect(result.diffResult.forbiddenTouched).toContain(".env");
  });

  it("checks committed changes against a base ref in CI guard mode", async () => {
    const root = await createGitFixture();
    await writeFile(path.join(root, ".env"), "SECRET=do-not-read\n");
    await git(root, ["add", ".env"]);
    await git(root, ["commit", "-m", "add forbidden file"]);

    const result = await guardCommand({ root, tier: "cheap", base: "HEAD~1" });

    expect(result.passed).toBe(false);
    expect(result.diffResult.forbiddenTouched).toContain(".env");
  });
});

async function createGitFixture(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "costscope-cli-e2e-"));
  await mkdir(path.join(root, "src"), { recursive: true });
  await mkdir(path.join(root, ".costscope"), { recursive: true });
  await git(root, ["init"]);
  await git(root, ["config", "user.email", "test@example.com"]);
  await git(root, ["config", "user.name", "CostScope Test"]);
  await writeFile(path.join(root, "package.json"), "{\"name\":\"fixture\",\"type\":\"module\"}\n");
  await writeFile(path.join(root, ".gitignore"), ".costscope/\n");
  await writeFile(path.join(root, "README.md"), "# Fixture\n");
  await writeFile(path.join(root, "src", "index.ts"), "export const fixture = true;\n");
  await git(root, ["add", "."]);
  await git(root, ["commit", "-m", "initial fixture"]);
  return root;
}

async function git(root: string, args: string[]): Promise<void> {
  await execa("git", args, { cwd: root });
}
