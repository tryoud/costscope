// SPDX-License-Identifier: Apache-2.0

import { execa } from "execa";
import type { BashInput, BashOutput, ToolResult } from "./types.js";

export async function bash(input: BashInput): Promise<ToolResult<BashOutput>> {
  try {
    const result = await execa(input.command, {
      shell: true,
      cwd: input.cwd ?? process.cwd(),
      timeout: input.timeoutMs ?? 120_000,
      reject: false,
      all: false
    });
    return {
      ok: true,
      output: {
        stdout: result.stdout?.toString() ?? "",
        stderr: result.stderr?.toString() ?? "",
        exitCode: result.exitCode ?? 0
      }
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
