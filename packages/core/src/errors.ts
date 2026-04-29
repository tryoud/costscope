// SPDX-License-Identifier: Apache-2.0

export class VibeRouterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VibeRouterError";
  }
}
