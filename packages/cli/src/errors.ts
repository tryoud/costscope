// SPDX-License-Identifier: Apache-2.0

export class VibeRouterCliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VibeRouterCliError";
  }
}
