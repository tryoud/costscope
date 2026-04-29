// SPDX-License-Identifier: Apache-2.0

import { runCommand } from "./shell.js";

export async function isGitRepository(rootPath: string): Promise<boolean> {
  const output = await runCommand("git", ["rev-parse", "--is-inside-work-tree"], rootPath);
  return output === "true";
}
