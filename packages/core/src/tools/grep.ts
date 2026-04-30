// SPDX-License-Identifier: Apache-2.0

import { globby } from "globby";
import { readFile } from "node:fs/promises";
import type { GrepInput, GrepMatch, GrepOutput, ToolResult } from "./types.js";

export async function grep(input: GrepInput): Promise<ToolResult<GrepOutput>> {
  try {
    const flags = input.caseInsensitive ? "i" : "";
    const regex = new RegExp(input.pattern, flags);
    const cwd = input.path ?? process.cwd();
    const patterns = input.glob ? [input.glob] : ["**/*"];
    const files = await globby(patterns, {
      cwd,
      gitignore: true,
      ignore: ["**/node_modules/**", "**/.git/**", "**/dist/**"],
      onlyFiles: true,
      absolute: true
    });

    const matches: GrepMatch[] = [];
    for (const file of files) {
      let content: string;
      try {
        content = await readFile(file, "utf8");
      } catch {
        continue;
      }
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line !== undefined && regex.test(line)) {
          matches.push({ file, line: i + 1, text: line });
        }
      }
    }

    return { ok: true, output: { matches } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
