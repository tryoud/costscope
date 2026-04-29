// SPDX-License-Identifier: Apache-2.0

import type { ProjectInfo, RiskLevel, TaskClassification } from "../types.js";
import { criticalKeywords, highKeywords, lowKeywords, mediumKeywords } from "./keywordRules.js";
import { tierForRisk } from "./riskRules.js";

export function ruleClassifier(task: string, projectInfo?: ProjectInfo): TaskClassification {
  const normalized = task.toLowerCase();
  const matches = {
    critical: findMatches(normalized, criticalKeywords),
    high: findMatches(normalized, highKeywords),
    medium: findMatches(normalized, mediumKeywords),
    low: findMatches(normalized, lowKeywords)
  };
  const risk = pickRisk(matches);
  const allMatches = [...matches.critical, ...matches.high, ...matches.medium, ...matches.low];
  const taskType = inferTaskType(normalized, projectInfo);
  const confidence = confidenceFor(risk, allMatches.length);

  return {
    taskType,
    risk,
    tier: tierForRisk(risk),
    confidence,
    reason: allMatches.length
      ? [`Matched ${risk}-risk keywords: ${allMatches.join(", ")}`]
      : ["No strong keyword match; routing conservatively."],
    flags: [...matches.critical, ...matches.high, ...matches.medium]
  };
}

function findMatches(task: string, keywords: string[]): string[] {
  return keywords.filter((keyword) => task.includes(keyword));
}

function pickRisk(matches: Record<RiskLevel, string[]>): RiskLevel {
  if (matches.critical.length > 0) return "critical";
  if (matches.high.length > 0) return "high";
  if (matches.medium.length > 0) return "medium";
  if (matches.low.length > 0) return "low";
  return "medium";
}

function confidenceFor(risk: RiskLevel, matchCount: number): number {
  if (matchCount === 0) return 0.45;
  const base = risk === "low" ? 0.78 : risk === "medium" ? 0.72 : 0.82;
  return Math.min(0.95, base + matchCount * 0.03);
}

function inferTaskType(task: string, projectInfo?: ProjectInfo): string {
  if (task.includes("readme") || task.includes("docs")) return "documentation";
  if (task.includes("auth") || task.includes("oauth") || task.includes("login")) return "auth";
  if (task.includes("stripe") || task.includes("payment") || task.includes("checkout")) return "payments";
  if (task.includes("database") || task.includes("migration")) return "database";
  if (task.includes("form") || task.includes("email")) return "form";
  if (task.includes("faq") || task.includes("pricing") || task.includes("hero")) return "ui-section";
  if (projectInfo?.projectType === "wordpress" && task.includes("shortcode")) return "wordpress-shortcode";
  return "general";
}
