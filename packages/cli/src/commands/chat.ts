// SPDX-License-Identifier: Apache-2.0

import { homedir } from "node:os";
import { resolve } from "node:path";
import {
  createSession,
  loadSession,
  findLatestSession,
  appendEntry,
  isTrusted,
  trustFolder,
  PermissionManager,
  readFile,
  writeFile,
  bash,
  grep,
  searchReplace,
  type AgentProfile,
  type ToolName
} from "@costscope/core";
import * as p from "@clack/prompts";
import { SlashRegistry } from "../slash/registry.js";
import { registerBuiltinSlashCommands } from "../slash/builtin.js";

export interface ChatOptions {
  root: string;
  profile?: AgentProfile;
  resume?: string;
  continueLast?: boolean;
  prompt?: string;
}

export async function chatCommand(options: ChatOptions): Promise<void> {
  const root = resolve(options.root);
  const home = homedir();
  const profile = options.profile ?? "default";
  const permissions = new PermissionManager(profile);

  if (!(await isTrusted(root, home))) {
    const confirmed = await p.confirm({
      message: `This folder is not trusted: ${root}. Trust it for future runs?`
    });
    if (p.isCancel(confirmed) || !confirmed) {
      p.cancel("Cancelled — folder not trusted.");
      return;
    }
    await trustFolder(root, home);
  }

  let session = options.resume
    ? await loadSession(options.resume, home)
    : options.continueLast
      ? (await findLatestSession(home)) ?? (await createSession(root, home))
      : await createSession(root, home);

  const slash = new SlashRegistry();
  registerBuiltinSlashCommands(slash);

  p.intro(`CostScope chat — profile: ${profile}, session: ${session.id}`);

  if (options.prompt) {
    session = await appendEntry(session, { role: "user", content: options.prompt }, home);
    p.log.info(`User: ${options.prompt}`);
    p.outro("Single-prompt mode complete. Use the chat REPL for full interaction.");
    return;
  }

  while (true) {
    const input = await p.text({
      message: "You",
      placeholder: "(type a message, / for slash commands, or /exit)"
    });
    if (p.isCancel(input)) break;
    const line = String(input).trim();
    if (!line) continue;

    if (line.startsWith("/")) {
      const result = await slash.execute(line, { rootPath: root, homeDir: home });
      if (result) {
        p.log.message(result.output);
        if (result.exit) break;
      }
      continue;
    }

    if (line.startsWith("!")) {
      const cmd = line.slice(1).trim();
      const decision = permissions.check({ tool: "bash" });
      if (decision === "deny") {
        p.log.error(`Profile '${profile}' forbids bash.`);
        continue;
      }
      if (decision === "ask") {
        const ok = await p.confirm({ message: `Run: ${cmd}?` });
        if (p.isCancel(ok) || !ok) continue;
      }
      const out = await bash({ command: cmd, cwd: root });
      if (out.ok && out.output) {
        p.log.message(out.output.stdout || out.output.stderr || `(exit ${out.output.exitCode})`);
      } else {
        p.log.error(out.error ?? "bash failed");
      }
      continue;
    }

    session = await appendEntry(session, { role: "user", content: line }, home);
    p.log.info("Recorded user message. (Note: full LLM round-trip requires provider config.)");
  }

  p.outro(`Session saved: ${session.id}`);
}

export async function executeToolWithPermission(
  tool: ToolName,
  args: Record<string, unknown>,
  permissions: PermissionManager
): Promise<{ ok: boolean; output?: unknown; error?: string }> {
  const decision = permissions.check({ tool, args });
  if (decision === "deny") return { ok: false, error: `Tool '${tool}' is forbidden by current profile.` };

  switch (tool) {
    case "read_file":
      return readFile(args as { path: string });
    case "write_file":
      return writeFile(args as { path: string; content: string });
    case "search_replace":
      return searchReplace(args as { path: string; oldString: string; newString: string });
    case "bash":
      return bash(args as { command: string });
    case "grep":
      return grep(args as { pattern: string });
    default:
      return { ok: false, error: `Unknown tool: ${tool}` };
  }
}
