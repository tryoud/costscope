// SPDX-License-Identifier: Apache-2.0

import { writeFile as fsWriteFile, mkdir, stat } from "node:fs/promises";
import { dirname } from "node:path";
import type { WriteFileInput, WriteFileOutput, ToolResult } from "./types.js";

export async function writeFile(input: WriteFileInput): Promise<ToolResult<WriteFileOutput>> {
  try {
    let created = true;
    try {
      await stat(input.path);
      created = false;
    } catch {
      // file does not exist
    }

    if (input.createDirs !== false) {
      await mkdir(dirname(input.path), { recursive: true });
    }

    await fsWriteFile(input.path, input.content, "utf8");
    return { ok: true, output: { bytesWritten: Buffer.byteLength(input.content, "utf8"), created } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
