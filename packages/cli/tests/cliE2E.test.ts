// SPDX-License-Identifier: Apache-2.0

import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execa } from "execa";
import { describe, expect, it } from "vitest";
import { checkDiffCommand } from "../src/commands/checkDiff.js";
import { classifyCommand } from "../src/commands/classify.js";
import { promptCommand } from "../src/commands/prompt.js";
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
