// SPDX-License-Identifier: Apache-2.0

export class CostScopeCliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CostScopeCliError";
  }
}
