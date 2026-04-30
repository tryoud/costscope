// SPDX-License-Identifier: Apache-2.0

import { readFile, readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export interface CustomPrompt {
  id: string;
  body: string;
  source: string;
}

export function customPromptsDir(home: string = homedir()): string {
  return join(home, ".costscope", "prompts");
}

export async function loadCustomPrompts(home: string = homedir()): Promise<CustomPrompt[]> {
  const dir = customPromptsDir(home);
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }
  const prompts: CustomPrompt[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    const id = entry.slice(0, -3);
    const path = join(dir, entry);
    const body = await readFile(path, "utf8");
    prompts.push({ id, body, source: path });
  }
  return prompts;
}

export async function loadCustomPrompt(id: string, home: string = homedir()): Promise<CustomPrompt | undefined> {
  const all = await loadCustomPrompts(home);
  return all.find((p) => p.id === id);
}
