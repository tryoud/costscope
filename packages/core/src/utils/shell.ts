// SPDX-License-Identifier: Apache-2.0

import { execa } from "execa";

export async function runCommand(command: string, args: string[], cwd: string): Promise<string> {
  const result = await execa(command, args, { cwd, reject: false });
  return result.stdout.trim();
}
