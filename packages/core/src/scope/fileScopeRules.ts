// SPDX-License-Identifier: Apache-2.0

import type { ProjectInfo } from "../types.js";

export function likelyDirectories(projectInfo: ProjectInfo): string[] {
  return projectInfo.importantPaths.map((item) => item.endsWith("/") ? item : `${item}/**`);
}

export function keywordTokens(task: string): string[] {
  return task
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !["add", "the", "and", "with", "for", "from"].includes(token));
}
