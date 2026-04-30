// SPDX-License-Identifier: Apache-2.0

import { readFile, readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ToolName } from "../tools/types.js";

export interface Skill {
  name: string;
  description: string;
  userInvocable: boolean;
  allowedTools?: ToolName[];
  body: string;
  source: string;
}

export interface SkillFrontmatter {
  name?: string;
  description?: string;
  "user-invocable"?: boolean | string;
  "allowed-tools"?: string[];
}

export function parseSkill(markdown: string, source: string): Skill | undefined {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return undefined;
  const [, frontmatterRaw, body] = match;
  if (!frontmatterRaw || body === undefined) return undefined;
  const frontmatter = parseSimpleYaml(frontmatterRaw);
  if (!frontmatter.name || !frontmatter.description) return undefined;
  return {
    name: String(frontmatter.name),
    description: String(frontmatter.description),
    userInvocable: frontmatter["user-invocable"] === true || frontmatter["user-invocable"] === "true",
    allowedTools: Array.isArray(frontmatter["allowed-tools"])
      ? (frontmatter["allowed-tools"] as ToolName[])
      : undefined,
    body: body.trim(),
    source
  };
}

function parseSimpleYaml(raw: string): SkillFrontmatter {
  const result: Record<string, unknown> = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (!m) continue;
    const [, key, valueRaw] = m;
    if (!key) continue;
    const trimmed = valueRaw?.trim() ?? "";
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      result[key] = trimmed
        .slice(1, -1)
        .split(",")
        .map((v) => v.trim().replace(/^['"]|['"]$/g, ""))
        .filter(Boolean);
    } else if (trimmed === "true") result[key] = true;
    else if (trimmed === "false") result[key] = false;
    else result[key] = trimmed.replace(/^['"]|['"]$/g, "");
  }
  return result as SkillFrontmatter;
}

async function readSkillsInDir(dir: string): Promise<Skill[]> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }
  const skills: Skill[] = [];
  for (const entry of entries) {
    const skillDir = join(dir, entry);
    let s;
    try {
      s = await stat(skillDir);
    } catch {
      continue;
    }
    if (!s.isDirectory()) continue;
    const skillPath = join(skillDir, "SKILL.md");
    try {
      const raw = await readFile(skillPath, "utf8");
      const skill = parseSkill(raw, skillPath);
      if (skill) skills.push(skill);
    } catch {
      // missing SKILL.md, skip
    }
  }
  return skills;
}

export async function loadSkills(rootPath: string, home: string = homedir()): Promise<Skill[]> {
  const dirs = [
    join(home, ".costscope", "skills"),
    join(rootPath, ".costscope", "skills")
  ];
  const all: Skill[] = [];
  const seen = new Set<string>();
  for (const dir of dirs) {
    const skills = await readSkillsInDir(dir);
    for (const skill of skills) {
      if (!seen.has(skill.name)) {
        seen.add(skill.name);
        all.push(skill);
      }
    }
  }
  return all;
}
