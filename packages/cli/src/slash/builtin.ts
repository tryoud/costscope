// SPDX-License-Identifier: Apache-2.0

import { loadSkills, loadCustomPrompts, listSessions } from "@costscope/core";
import type { SlashCommand, SlashRegistry } from "./registry.js";

export function registerBuiltinSlashCommands(registry: SlashRegistry): void {
  const help: SlashCommand = {
    name: "help",
    description: "List all slash commands",
    handler: async () => {
      const lines = registry.list().map((c) => `/${c.name} — ${c.description}`);
      return { output: lines.join("\n") };
    }
  };

  const exit: SlashCommand = {
    name: "exit",
    description: "Exit the chat session",
    handler: () => ({ output: "Goodbye.", exit: true })
  };

  const quit: SlashCommand = {
    name: "quit",
    description: "Exit the chat session",
    handler: () => ({ output: "Goodbye.", exit: true })
  };

  const skills: SlashCommand = {
    name: "skills",
    description: "List available skills (project + user)",
    handler: async (_args, ctx) => {
      const skills = await loadSkills(ctx.rootPath, ctx.homeDir);
      if (skills.length === 0) return { output: "No skills found." };
      const lines = skills.map((s) => `${s.name} — ${s.description}`);
      return { output: lines.join("\n") };
    }
  };

  const prompts: SlashCommand = {
    name: "prompts",
    description: "List custom prompts from ~/.costscope/prompts/",
    handler: async (_args, ctx) => {
      const prompts = await loadCustomPrompts(ctx.homeDir);
      if (prompts.length === 0) return { output: "No custom prompts found." };
      return { output: prompts.map((p) => p.id).join("\n") };
    }
  };

  const sessions: SlashCommand = {
    name: "sessions",
    description: "List recent sessions",
    handler: async (_args, ctx) => {
      const ids = await listSessions(ctx.homeDir);
      if (ids.length === 0) return { output: "No sessions found." };
      return { output: ids.slice(0, 20).join("\n") };
    }
  };

  registry.register(help);
  registry.register(exit);
  registry.register(quit);
  registry.register(skills);
  registry.register(prompts);
  registry.register(sessions);
}
