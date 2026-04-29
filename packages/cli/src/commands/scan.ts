// SPDX-License-Identifier: Apache-2.0

import { detectProject } from "@viberouter/core";

export async function scanCommand(options: { root: string }) {
  return detectProject(options.root);
}
