// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { mkdtemp, writeFile as fsWriteFile, readFile as fsReadFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFile, writeFile, searchReplace, bash, grep } from "../src/tools/index.js";

async function tempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "costscope-tools-"));
}

describe("readFile tool", () => {
  it("reads a file fully", async () => {
    const dir = await tempDir();
    const path = join(dir, "x.txt");
    await fsWriteFile(path, "line1\nline2\nline3");
    const result = await readFile({ path });
    expect(result.ok).toBe(true);
    expect(result.output?.content).toBe("line1\nline2\nline3");
    expect(result.output?.totalLines).toBe(3);
  });

  it("supports offset and limit", async () => {
    const dir = await tempDir();
    const path = join(dir, "x.txt");
    await fsWriteFile(path, "a\nb\nc\nd\ne");
    const result = await readFile({ path, offset: 1, limit: 2 });
    expect(result.output?.content).toBe("b\nc");
  });

  it("returns error on missing file", async () => {
    const result = await readFile({ path: "/nonexistent/file.txt" });
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("writeFile tool", () => {
  it("writes a new file and reports created:true", async () => {
    const dir = await tempDir();
    const path = join(dir, "new.txt");
    const result = await writeFile({ path, content: "hello" });
    expect(result.ok).toBe(true);
    expect(result.output?.created).toBe(true);
    const content = await fsReadFile(path, "utf8");
    expect(content).toBe("hello");
  });

  it("overwrites existing file with created:false", async () => {
    const dir = await tempDir();
    const path = join(dir, "existing.txt");
    await fsWriteFile(path, "old");
    const result = await writeFile({ path, content: "new" });
    expect(result.output?.created).toBe(false);
  });

  it("creates parent directories by default", async () => {
    const dir = await tempDir();
    const path = join(dir, "nested/deep/file.txt");
    const result = await writeFile({ path, content: "x" });
    expect(result.ok).toBe(true);
  });
});

describe("searchReplace tool", () => {
  it("replaces a unique occurrence", async () => {
    const dir = await tempDir();
    const path = join(dir, "x.txt");
    await fsWriteFile(path, "hello world");
    const result = await searchReplace({ path, oldString: "world", newString: "vibe" });
    expect(result.ok).toBe(true);
    expect(result.output?.replacements).toBe(1);
    expect(await fsReadFile(path, "utf8")).toBe("hello vibe");
  });

  it("fails when old_string not found", async () => {
    const dir = await tempDir();
    const path = join(dir, "x.txt");
    await fsWriteFile(path, "abc");
    const result = await searchReplace({ path, oldString: "xyz", newString: "q" });
    expect(result.ok).toBe(false);
  });

  it("fails when old_string occurs multiple times without replaceAll", async () => {
    const dir = await tempDir();
    const path = join(dir, "x.txt");
    await fsWriteFile(path, "foo foo foo");
    const result = await searchReplace({ path, oldString: "foo", newString: "bar" });
    expect(result.ok).toBe(false);
  });

  it("replaces all occurrences with replaceAll:true", async () => {
    const dir = await tempDir();
    const path = join(dir, "x.txt");
    await fsWriteFile(path, "foo foo foo");
    const result = await searchReplace({ path, oldString: "foo", newString: "bar", replaceAll: true });
    expect(result.ok).toBe(true);
    expect(result.output?.replacements).toBe(3);
    expect(await fsReadFile(path, "utf8")).toBe("bar bar bar");
  });
});

describe("bash tool", () => {
  it("runs a simple command", async () => {
    const result = await bash({ command: "echo hello" });
    expect(result.ok).toBe(true);
    expect(result.output?.stdout.trim()).toBe("hello");
    expect(result.output?.exitCode).toBe(0);
  });

  it("captures non-zero exit code without crashing", async () => {
    const result = await bash({ command: "exit 7" });
    expect(result.ok).toBe(true);
    expect(result.output?.exitCode).toBe(7);
  });

  it("respects cwd", async () => {
    const dir = await tempDir();
    const result = await bash({ command: "pwd", cwd: dir });
    const stdout = result.output?.stdout.trim() ?? "";
    expect(stdout.endsWith(dir) || dir.endsWith(stdout)).toBe(true);
  });
});

describe("grep tool", () => {
  it("finds matches in files", async () => {
    const dir = await tempDir();
    await fsWriteFile(join(dir, "a.txt"), "needle in haystack\nother line");
    await fsWriteFile(join(dir, "b.txt"), "no match here");
    const result = await grep({ pattern: "needle", path: dir });
    expect(result.ok).toBe(true);
    expect(result.output?.matches).toHaveLength(1);
    expect(result.output?.matches[0]?.text).toContain("needle");
  });

  it("supports case-insensitive search", async () => {
    const dir = await tempDir();
    await fsWriteFile(join(dir, "a.txt"), "HELLO world");
    const result = await grep({ pattern: "hello", path: dir, caseInsensitive: true });
    expect(result.output?.matches).toHaveLength(1);
  });

  it("returns empty matches when nothing found", async () => {
    const dir = await tempDir();
    await fsWriteFile(join(dir, "a.txt"), "abc");
    const result = await grep({ pattern: "xyz", path: dir });
    expect(result.output?.matches).toEqual([]);
  });
});
