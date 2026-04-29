// SPDX-License-Identifier: Apache-2.0

export const defaultForbiddenFiles = [
  ".env",
  ".env.*",
  "**/*.pem",
  "**/*.key",
  "**/*.p12",
  "**/*.pfx",
  "**/id_rsa",
  "**/id_ed25519",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lockb",
  "wp-config.php"
];

export const cheapModeForbiddenFiles = [
  "package.json",
  "astro.config.*",
  "next.config.*",
  "vite.config.*",
  "svelte.config.*",
  "remix.config.*",
  "tsconfig.json",
  "tsconfig.*.json",
  "turbo.json"
];
