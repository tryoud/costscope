// SPDX-License-Identifier: Apache-2.0

export interface SlashCommand {
  name: string;
  description: string;
  handler: (args: string, ctx: SlashContext) => Promise<SlashResult> | SlashResult;
}

export interface SlashContext {
  rootPath: string;
  homeDir: string;
}

export interface SlashResult {
  output: string;
  exit?: boolean;
}

export class SlashRegistry {
  private commands = new Map<string, SlashCommand>();

  register(command: SlashCommand): void {
    this.commands.set(command.name, command);
  }

  list(): SlashCommand[] {
    return [...this.commands.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  get(name: string): SlashCommand | undefined {
    return this.commands.get(name);
  }

  parse(line: string): { name: string; args: string } | undefined {
    if (!line.startsWith("/")) return undefined;
    const [name, ...rest] = line.slice(1).split(/\s+/);
    if (!name) return undefined;
    return { name, args: rest.join(" ") };
  }

  async execute(line: string, ctx: SlashContext): Promise<SlashResult | undefined> {
    const parsed = this.parse(line);
    if (!parsed) return undefined;
    const cmd = this.get(parsed.name);
    if (!cmd) return { output: `Unknown slash command: /${parsed.name}` };
    return cmd.handler(parsed.args, ctx);
  }
}
