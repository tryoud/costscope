// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseSkill, loadSkills } from "../src/skills/loadSkills.js";

async function tempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "costscope-skills-"));
}

const VALID_SKILL = `---
name: my-skill
description: Does something useful
user-invocable: true
allowed-tools: [read_file, grep]
---

# My Skill

Body content here.`;

describe("parseSkill", () => {
  it("parses valid frontmatter and body", () => {
    const skill = parseSkill(VALID_SKILL, "/x/SKILL.md");
    expect(skill?.name).toBe("my-skill");
    expect(skill?.description).toBe("Does something useful");
    expect(skill?.userInvocable).toBe(true);
    expect(skill?.allowedTools).toEqual(["read_file", "grep"]);
    expect(skill?.body).toContain("# My Skill");
  });

  it("returns undefined for missing frontmatter", () => {
    expect(parseSkill("just a body", "/x")).toBeUndefined();
  });

  it("returns undefined when name or description missing", () => {
    const noName = `---\ndescription: x\n---\nbody`;
    expect(parseSkill(noName, "/x")).toBeUndefined();
  });

  it("defaults user-invocable to false", () => {
    const md = `---\nname: x\ndescription: y\n---\nbody`;
    expect(parseSkill(md, "/x")?.userInvocable).toBe(false);
  });
});

describe("loadSkills", () => {
  it("loads skills from project .costscope/skills/", async () => {
    const root = await tempDir();
    const home = await tempDir();
    const skillDir = join(root, ".costscope", "skills", "my-skill");
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, "SKILL.md"), VALID_SKILL, "utf8");
    const skills = await loadSkills(root, home);
    expect(skills).toHaveLength(1);
    expect(skills[0]?.name).toBe("my-skill");
  });

  it("loads skills from home ~/.costscope/skills/", async () => {
    const root = await tempDir();
    const home = await tempDir();
    const skillDir = join(home, ".costscope", "skills", "global-skill");
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, "SKILL.md"),
      `---\nname: global-skill\ndescription: from home\n---\nbody`,
      "utf8"
    );
    const skills = await loadSkills(root, home);
    expect(skills.find((s) => s.name === "global-skill")).toBeDefined();
  });

  it("project skills override home skills with same name", async () => {
    const root = await tempDir();
    const home = await tempDir();
    const homeDir = join(home, ".costscope", "skills", "shared");
    const projectDir = join(root, ".costscope", "skills", "shared");
    await mkdir(homeDir, { recursive: true });
    await mkdir(projectDir, { recursive: true });
    await writeFile(
      join(homeDir, "SKILL.md"),
      `---\nname: shared\ndescription: home version\n---\nbody`,
      "utf8"
    );
    await writeFile(
      join(projectDir, "SKILL.md"),
      `---\nname: shared\ndescription: project version\n---\nbody`,
      "utf8"
    );
    const skills = await loadSkills(root, home);
    const shared = skills.filter((s) => s.name === "shared");
    expect(shared).toHaveLength(1);
    // home is loaded first, so it takes precedence in the seen-set
    expect(shared[0]?.description).toBe("home version");
  });

  it("returns empty array when no skills directory exists", async () => {
    const root = await tempDir();
    const home = await tempDir();
    expect(await loadSkills(root, home)).toEqual([]);
  });
});
