// SPDX-License-Identifier: Apache-2.0

import { detectProject } from "@costscope/core";

export async function scanCommand(options: { root: string }) {
  return detectProject(options.root);
}
