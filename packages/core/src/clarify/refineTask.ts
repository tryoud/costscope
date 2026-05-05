// SPDX-License-Identifier: Apache-2.0

import type { ClarifyAnswer } from "./types.js";

export function refineTask(originalTask: string, answers: ClarifyAnswer[]): string {
  if (answers.length === 0) return originalTask.trim();
  const lines = [originalTask.trim(), "", "Clarifications from user:"];
  for (const a of answers) {
    lines.push(`- ${a.question} → ${a.answer}`);
  }
  return lines.join("\n");
}
