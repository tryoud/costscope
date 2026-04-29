// SPDX-License-Identifier: Apache-2.0

export function listBlock(title: string, values: string[]): string {
  if (values.length === 0) return `${title}\n- none`;
  return `${title}\n${values.map((value) => `- ${value}`).join("\n")}`;
}

export function commandBlock(commands: Array<string | undefined | null>): string {
  const available = commands.filter((command): command is string => Boolean(command));
  if (available.length === 0) return "- No project check commands detected.";
  return available.map((command) => `- ${command}`).join("\n");
}
