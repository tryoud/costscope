// SPDX-License-Identifier: Apache-2.0

import { readFile as fsReadFile } from "node:fs/promises";
import type { ReadFileInput, ReadFileOutput, ToolResult } from "./types.js";

export async function readFile(input: ReadFileInput): Promise<ToolResult<ReadFileOutput>> {
  try {
    const raw = await fsReadFile(input.path, "utf8");
    const lines = raw.split("\n");
    const totalLines = lines.length;
    const offset = input.offset ?? 0;
    const limit = input.limit ?? totalLines;
    const slice = lines.slice(offset, offset + limit).join("\n");
    return { ok: true, output: { content: slice, totalLines } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
