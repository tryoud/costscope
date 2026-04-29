// SPDX-License-Identifier: Apache-2.0

export function resolveApiKey(raw: string | undefined, env: NodeJS.ProcessEnv = process.env): string | undefined {
  if (!raw) return undefined;
  const match = raw.match(/^\$\{([A-Z0-9_]+)\}$/);
  if (!match) return raw;
  const name = match[1];
  return name ? env[name] : undefined;
}
