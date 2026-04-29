// SPDX-License-Identifier: Apache-2.0

import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execa } from "execa";
import { describe, expect, it } from "vitest";
import { checkDiffScope } from "../src/diff/checkDiffScope.js";
import { getChangedFiles, getGitDiff } from "../src/diff/getChangedFiles.js";
import type { FileScope } from "../src/types.js";

describe("git diff scope e2e", () => {
  it("detects staged, unstaged, and untracked changed files from a real git repo", async () => {
    const root = await createGitFixture();
    await writeFile(path.join(root, "src", "Allowed.ts"), "export const allowed = 2;\n");
    await writeFile(path.join(root, "src", "Maybe.ts"), "export const maybe = true;\n");
    await git(root, ["add", "src/Maybe.ts"]);
    await writeFile(path.join(root, ".env"), "SECRET=do-not-read\n");

    await expect(getChangedFiles(root)).resolves.toEqual([".env", "src/Allowed.ts", "src/Maybe.ts"]);
  });

  it("blocks real git changes that touch forbidden files", async () => {
    const root = await createGitFixture();
    await writeFile(path.join(root, "src", "Allowed.ts"), "export const allowed = 2;\n");
    await writeFile(path.join(root, ".env"), "SECRET=do-not-read\n");

    const result = checkDiffScope(await getChangedFiles(root), scope(), "cheap");

    expect(result.verdict).toBe("block");
    expect(result.forbiddenTouched).toContain(".env");
    expect(result.changedFiles).toContain("src/Allowed.ts");
  });

  it("passes real git changes that stay inside allowed files", async () => {
    const root = await createGitFixture();
    await writeFile(path.join(root, "src", "Allowed.ts"), "export const allowed = 2;\n");

    const result = checkDiffScope(await getChangedFiles(root), scope(), "cheap");
    const diff = await getGitDiff(root);

    expect(result.verdict).toBe("pass");
    expect(diff).toContain("src/Allowed.ts");
  });
});

async function createGitFixture(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "costscope-git-e2e-"));
  await mkdir(path.join(root, "src"), { recursive: true });
  await git(root, ["init"]);
  await git(root, ["config", "user.email", "test@example.com"]);
  await git(root, ["config", "user.name", "CostScope Test"]);
  await writeFile(path.join(root, "package.json"), "{\"type\":\"module\"}\n");
  await writeFile(path.join(root, "src", "Allowed.ts"), "export const allowed = 1;\n");
  await git(root, ["add", "."]);
  await git(root, ["commit", "-m", "initial fixture"]);
  return root;
}

async function git(root: string, args: string[]): Promise<void> {
  await execa("git", args, { cwd: root });
}

function scope(): FileScope {
  return {
    allowedFiles: ["src/Allowed.ts"],
    maybeFiles: ["src/Maybe.ts"],
    forbiddenFiles: [".env", ".env.*", "**/*.pem", "**/*.key"],
    reason: []
  };
}
