// SPDX-License-Identifier: Apache-2.0

export const defaultForbiddenFiles = [
  ".env",
  ".env.*",
  "**/*.pem",
  "**/*.key",
  "**/id_rsa",
  "**/id_ed25519",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lockb",
  "wp-config.php"
];

export const cheapModeForbiddenFiles = ["package.json", "astro.config.*", "next.config.*", "vite.config.*"];
