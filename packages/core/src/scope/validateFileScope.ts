// SPDX-License-Identifier: Apache-2.0

import type { FileScope } from "../types.js";
import { uniquePaths } from "./pathMatchers.js";

export function validateFileScope(scope: FileScope): FileScope {
  return {
    allowedFiles: uniquePaths(scope.allowedFiles),
    maybeFiles: uniquePaths(scope.maybeFiles),
    forbiddenFiles: uniquePaths(scope.forbiddenFiles),
    reason: scope.reason
  };
}
