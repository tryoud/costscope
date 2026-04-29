// SPDX-License-Identifier: Apache-2.0

export function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}
