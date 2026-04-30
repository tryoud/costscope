// SPDX-License-Identifier: Apache-2.0

import type { VaguenessAssessment } from "./types.js";

const BROAD_VERBS = ["build", "create", "make", "implement", "design", "develop", "set up", "add a"];
const BROAD_NOUNS = [
  "funnel",
  "page",
  "feature",
  "system",
  "flow",
  "app",
  "site",
  "section",
  "dashboard",
  "landing",
  "experience",
  "workflow"
];

export function detectVagueness(task: string): VaguenessAssessment {
  const reasons: string[] = [];
  const trimmed = task.trim();
  const lower = trimmed.toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean);

  if (trimmed.length < 30) reasons.push("Task description is very short.");
  if (words.length < 8) reasons.push("Task uses fewer than 8 words.");

  const broadVerb = BROAD_VERBS.find((v) => lower.includes(v));
  const broadNoun = BROAD_NOUNS.find((n) => lower.includes(n));
  if (broadVerb && broadNoun) {
    reasons.push(`Broad scope: '${broadVerb} ... ${broadNoun}'.`);
  }

  if (!/[A-Z]/.test(trimmed.replace(/^./, ""))) {
    // proper-noun signal — lack of any capitalized term inside text suggests low specificity
    if (!/(\d|\.[a-z]+|\/)/.test(lower)) {
      reasons.push("No specific identifiers (file paths, brands, numbers) detected.");
    }
  }

  return { vague: reasons.length >= 2, reasons };
}
