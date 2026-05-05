// SPDX-License-Identifier: Apache-2.0

import { readFile, writeFile } from "node:fs/promises";
import type { SearchReplaceInput, SearchReplaceOutput, ToolResult } from "./types.js";

export async function searchReplace(input: SearchReplaceInput): Promise<ToolResult<SearchReplaceOutput>> {
  try {
    const original = await readFile(input.path, "utf8");
    if (!original.includes(input.oldString)) {
      return { ok: false, error: `old_string not found in ${input.path}` };
    }

    let replaced: string;
    let count: number;
    if (input.replaceAll) {
      const parts = original.split(input.oldString);
      count = parts.length - 1;
      replaced = parts.join(input.newString);
    } else {
      const occurrences = original.split(input.oldString).length - 1;
      if (occurrences > 1) {
        return { ok: false, error: `old_string appears ${occurrences} times — pass replaceAll:true or extend context` };
      }
      replaced = original.replace(input.oldString, input.newString);
      count = 1;
    }

    await writeFile(input.path, replaced, "utf8");
    return { ok: true, output: { replacements: count } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
