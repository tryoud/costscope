// SPDX-License-Identifier: Apache-2.0

import { execa } from "execa";

export async function getChangedFiles(rootPath: string): Promise<string[]> {
  const [unstaged, staged, untracked] = await Promise.all([
    gitLines(rootPath, ["diff", "--name-only"]),
    gitLines(rootPath, ["diff", "--cached", "--name-only"]),
    gitLines(rootPath, ["ls-files", "--others", "--exclude-standard"])
  ]);
  return [...new Set([...unstaged, ...staged, ...untracked])].sort();
}

export async function getGitDiff(rootPath: string): Promise<string> {
  const [unstaged, staged] = await Promise.all([
    gitText(rootPath, ["diff"]),
    gitText(rootPath, ["diff", "--cached"])
  ]);
  return [staged, unstaged].filter(Boolean).join("\n");
}

async function gitLines(rootPath: string, args: string[]): Promise<string[]> {
  const text = await gitText(rootPath, args);
  return text.split("\n").map((line) => line.trim()).filter(Boolean);
}

async function gitText(rootPath: string, args: string[]): Promise<string> {
  const result = await execa("git", args, { cwd: rootPath, reject: false });
  if (result.exitCode !== 0) return "";
  return result.stdout.trim();
}
