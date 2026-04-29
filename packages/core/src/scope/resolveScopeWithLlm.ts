// SPDX-License-Identifier: Apache-2.0

import type { CostScopeConfig, FileScope, ProjectInfo, ProviderConfig } from "../types.js";
import { callLlm } from "../llm/call.js";

export async function resolveScopeWithLlm(
  task: string,
  projectInfo: ProjectInfo,
  config: CostScopeConfig,
  fallback: FileScope
): Promise<FileScope> {
  const provider = config.providers?.["scope-resolver"];
  if (!provider) return fallback;
  if (projectInfo.detectedFiles.length === 0) return fallback;

  try {
    const files = await queryLlmForScope(task, projectInfo.detectedFiles, provider);
    if (files.length === 0) return fallback;
    return {
      ...fallback,
      allowedFiles: files,
      reason: [...fallback.reason, `LLM scope-resolver (${provider.model}) identified ${files.length} file(s).`]
    };
  } catch {
    // LLM call failed — fall back to rule-based result silently
    return fallback;
  }
}

async function queryLlmForScope(task: string, allFiles: string[], provider: ProviderConfig): Promise<string[]> {
  const fileList = allFiles.slice(0, 150).join("\n");
  const prompt = `You are a file-scope resolver for a coding assistant. Given a task and a project file list, return ONLY the files that need to be modified.

Task: ${task}

Project files:
${fileList}

Rules:
- Return a JSON array of file paths, e.g. ["src/foo.ts", "src/bar.ts"]
- Max 8 files
- Only include files that are very likely to need changes
- If unsure, return fewer files rather than more
- Reply with ONLY the JSON array, no explanation`;

  const response = await callLlm(provider, [{ role: "user", content: prompt }], {
    maxTokens: 256,
    temperature: 0
  });

  return parseFileArray(response, allFiles);
}

function parseFileArray(raw: string, validFiles: string[]): string[] {
  const match = raw.match(/\[[\s\S]*?\]/);
  if (!match) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  const validSet = new Set(validFiles);
  return parsed
    .filter((f): f is string => typeof f === "string")
    .filter((f) => validSet.has(f))
    .slice(0, 8);
}
