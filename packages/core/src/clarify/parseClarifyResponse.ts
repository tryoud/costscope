// SPDX-License-Identifier: Apache-2.0

import type { ClarifyQuestion, ClarifyOption } from "./types.js";

const MIN_QUESTIONS = 3;
const MAX_QUESTIONS = 10;

export function parseClarifyResponse(raw: string): ClarifyQuestion[] {
  const cleaned = stripCodeFences(raw).trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < 0) {
    throw new Error("Clarify response did not contain a JSON object.");
  }
  const body = cleaned.slice(start, end + 1);
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch (err) {
    throw new Error(`Clarify response is not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
  }
  return validateQuestions(parsed);
}

function stripCodeFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

function validateQuestions(parsed: unknown): ClarifyQuestion[] {
  if (!isRecord(parsed) || !Array.isArray(parsed.questions)) {
    throw new Error("Clarify response missing 'questions' array.");
  }
  const questions = parsed.questions as unknown[];
  if (questions.length < MIN_QUESTIONS || questions.length > MAX_QUESTIONS) {
    throw new Error(`Clarify response must have ${MIN_QUESTIONS}-${MAX_QUESTIONS} questions; got ${questions.length}.`);
  }
  return questions.map((q, i) => validateQuestion(q, i));
}

function validateQuestion(q: unknown, index: number): ClarifyQuestion {
  if (!isRecord(q)) throw new Error(`Question ${index} is not an object.`);
  const id = typeof q.id === "string" && q.id.trim() ? q.id : `q${index + 1}`;
  if (typeof q.question !== "string" || !q.question.trim()) {
    throw new Error(`Question ${index} missing 'question' string.`);
  }
  if (!Array.isArray(q.options) || q.options.length !== 3) {
    throw new Error(`Question ${index} must have exactly 3 options.`);
  }
  const options: ClarifyOption[] = q.options.map((o, j) => validateOption(o, index, j));
  const recommendedCount = options.filter((o) => o.recommended).length;
  if (recommendedCount === 0) {
    options[0]!.recommended = true;
  } else if (recommendedCount > 1) {
    let kept = false;
    for (const o of options) {
      if (o.recommended && !kept) {
        kept = true;
      } else {
        o.recommended = false;
      }
    }
  }
  return { id, question: q.question.trim(), options };
}

function validateOption(o: unknown, qIndex: number, oIndex: number): ClarifyOption {
  if (!isRecord(o)) throw new Error(`Question ${qIndex} option ${oIndex} is not an object.`);
  if (typeof o.label !== "string" || !o.label.trim()) {
    throw new Error(`Question ${qIndex} option ${oIndex} missing 'label' string.`);
  }
  return { label: o.label.trim(), recommended: o.recommended === true };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
