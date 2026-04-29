// SPDX-License-Identifier: Apache-2.0

import { colors } from "./colors.js";

export function printHuman(title: string, value: unknown): void {
  console.log(colors.bold(title));
  console.log(JSON.stringify(value, null, 2));
}
