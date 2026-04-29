// SPDX-License-Identifier: Apache-2.0

import type { ProjectInfo, TaskClassification } from "../types.js";
import { ruleClassifier } from "./ruleClassifier.js";

export function classifyTask(task: string, projectInfo?: ProjectInfo): TaskClassification {
  return ruleClassifier(task, projectInfo);
}
