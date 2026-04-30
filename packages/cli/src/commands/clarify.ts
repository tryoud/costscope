// SPDX-License-Identifier: Apache-2.0

import { writeFile } from "node:fs/promises";
import path from "node:path";
import * as p from "@clack/prompts";
import {
  loadConfig,
  detectProject,
  generateQuestions,
  detectVagueness,
  refineTask,
  type ClarifyAnswer,
  type ClarifyQuestion,
  type ClarifySession
} from "@costscope/core";

export interface ClarifyCommandOptions {
  root: string;
  config?: string;
  output?: string;
  force?: boolean;
  json?: boolean;
}

const CUSTOM_VALUE = "__custom__";

export async function clarifyCommand(task: string, options: ClarifyCommandOptions): Promise<ClarifySession> {
  const root = path.resolve(options.root);
  const config = await loadConfig(root, options.config);
  const projectInfo = await detectProject(root).catch(() => undefined);

  const vagueness = detectVagueness(task);
  if (!vagueness.vague && !options.force) {
    return {
      originalTask: task,
      questions: [],
      answers: [],
      refinedTask: task
    };
  }

  if (!options.json) {
    p.intro("Clarifying your task — answer 3-10 quick questions.");
    if (vagueness.reasons.length > 0) {
      p.log.info(`Triggered because: ${vagueness.reasons.join(" ")}`);
    }
  }

  const questions = await generateQuestions({ task, config, projectInfo });

  if (options.json) {
    return {
      originalTask: task,
      questions,
      answers: [],
      refinedTask: task
    };
  }

  const answers: ClarifyAnswer[] = [];
  for (const q of questions) {
    const answer = await askQuestion(q);
    if (answer === undefined) {
      p.cancel("Clarify cancelled.");
      throw new Error("Clarify cancelled by user.");
    }
    answers.push(answer);
  }

  const refinedTask = refineTask(task, answers);
  const session: ClarifySession = {
    originalTask: task,
    questions,
    answers,
    refinedTask
  };

  if (options.output) {
    const outPath = path.resolve(options.output);
    await writeFile(outPath, refinedTask, "utf8");
    p.log.info(`Refined task written to ${outPath}`);
  }

  p.outro("Clarification complete.");
  return session;
}

async function askQuestion(q: ClarifyQuestion): Promise<ClarifyAnswer | undefined> {
  const optionItems = q.options.map((o) => ({
    value: o.label,
    label: o.recommended ? `${o.label} (recommended)` : o.label
  }));
  optionItems.push({ value: CUSTOM_VALUE, label: "Custom answer…" });

  const choice = await p.select({
    message: q.question,
    options: optionItems,
    initialValue: q.options.find((o) => o.recommended)?.label ?? q.options[0]?.label
  });
  if (p.isCancel(choice)) return undefined;

  if (choice === CUSTOM_VALUE) {
    const custom = await p.text({
      message: "Your answer:",
      placeholder: "Type a free-form answer",
      validate: (v) => (v && v.trim() ? undefined : "Answer is required.")
    });
    if (p.isCancel(custom)) return undefined;
    return {
      questionId: q.id,
      question: q.question,
      answer: String(custom).trim(),
      custom: true
    };
  }

  return {
    questionId: q.id,
    question: q.question,
    answer: String(choice),
    custom: false
  };
}
