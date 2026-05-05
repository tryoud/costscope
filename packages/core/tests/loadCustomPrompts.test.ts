// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadCustomPrompts, loadCustomPrompt } from "../src/promptsDir/loadCustomPrompts.js";

async function tempHome(): Promise<string> {
  return mkdtemp(join(tmpdir(), "costscope-prompts-"));
}

async function setupPrompts(home: string, files: Record<string, string>): Promise<void> {
  const dir = join(home, ".costscope", "prompts");
  await mkdir(dir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    await writeFile(join(dir, name), content, "utf8");
  }
}

describe("loadCustomPrompts", () => {
  it("returns empty array when no prompts dir exists", async () => {
    const home = await tempHome();
    expect(await loadCustomPrompts(home)).toEqual([]);
  });

  it("loads .md files from ~/.costscope/prompts/", async () => {
    const home = await tempHome();
    await setupPrompts(home, { "review.md": "review prompt body", "plan.md": "plan body" });
    const prompts = await loadCustomPrompts(home);
    expect(prompts).toHaveLength(2);
    expect(prompts.map((p) => p.id).sort()).toEqual(["plan", "review"]);
  });

  it("ignores non-md files", async () => {
    const home = await tempHome();
    await setupPrompts(home, { "p.md": "x", "p.txt": "y" });
    expect((await loadCustomPrompts(home))).toHaveLength(1);
  });

  it("loadCustomPrompt returns specific prompt by id", async () => {
    const home = await tempHome();
    await setupPrompts(home, { "review.md": "review body" });
    const prompt = await loadCustomPrompt("review", home);
    expect(prompt?.body).toBe("review body");
  });

  it("loadCustomPrompt returns undefined for missing id", async () => {
    const home = await tempHome();
    expect(await loadCustomPrompt("missing", home)).toBeUndefined();
  });
});
