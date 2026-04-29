// SPDX-License-Identifier: Apache-2.0

export function stableJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
