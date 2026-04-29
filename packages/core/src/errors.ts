// SPDX-License-Identifier: Apache-2.0

export class CostScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CostScopeError";
  }
}
