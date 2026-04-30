// SPDX-License-Identifier: Apache-2.0

export interface ReplCommand {
  aliases: string[];
  description: string;
  handler: string;
}

export const COMMANDS: ReplCommand[] = [
  { aliases: ["/help"],     description: "Show available commands",                  handler: "help"    },
  { aliases: ["/theme"],    description: "Switch color theme: dark · light · dracula · solarized", handler: "theme"  },
  { aliases: ["/status"],   description: "Show git status (quick)",                   handler: "status"  },
  { aliases: ["/model"],    description: "Switch worker model for current tier",       handler: "model"   },
  { aliases: ["/keybindings", "/keys"], description: "Show keyboard shortcuts",          handler: "keybindings" },
  { aliases: ["/context"],  description: "Show current conversation context",      handler: "context" },
  { aliases: ["/history"],  description: "Show session history",                  handler: "history"  },
  { aliases: ["/sessions"],  description: "List and switch sessions",              handler: "sessions" },
  { aliases: ["/new"],      description: "Start a new session",                  handler: "new"     },
  { aliases: ["/plan"],     description: "Show execution plan without running",       handler: "plan"    },
  { aliases: ["/route"],    description: "Show routing decision for a task",          handler: "route"   },
  { aliases: ["/scope"],    description: "Show file scope for a task",                handler: "scope"   },
  { aliases: ["/scan"],     description: "Detect project type and structure",         handler: "scan"    },
  { aliases: ["/cost"],     description: "Estimate cost for a task",                  handler: "cost"    },
  { aliases: ["/config"],   description: "Show current CostScope config",             handler: "config"  },
  { aliases: ["/preset"],   description: "Switch preset: default · student · quality", handler: "preset" },
  { aliases: ["/clear"],    description: "Clear session history",                     handler: "clear"   },
  { aliases: ["/update"],   description: "Check for and install latest version",       handler: "update"  },
  { aliases: ["/exit", "/quit"], description: "Exit the REPL",                       handler: "exit"    },
];

export interface ParsedCommand {
  handler: string;
  args: string;
  command: ReplCommand;
}

export function parseSlashInput(input: string): ParsedCommand | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return null;

  const [word = "", ...rest] = trimmed.split(/\s+/);
  const args = rest.join(" ");
  const cmd = COMMANDS.find((c) => c.aliases.includes(word.toLowerCase()));
  if (!cmd) return null;

  return { handler: cmd.handler, args, command: cmd };
}

export function getCompletions(partial: string): ReplCommand[] {
  if (!partial.startsWith("/")) return [];
  const lower = partial.toLowerCase();
  return COMMANDS.filter((c) => c.aliases.some((a) => a.startsWith(lower)));
}
