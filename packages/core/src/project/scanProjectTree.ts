// SPDX-License-Identifier: Apache-2.0

import { globby } from "globby";

export async function scanProjectTree(rootPath: string): Promise<string[]> {
  return globby(
    [
      "package.json",
      "README.md",
      "docs",
      "astro.config.*",
      "next.config.*",
      "vite.config.*",
      "app",
      "app/**/*",
      "pages",
      "pages/**/*",
      "src",
      "src/**/*",
      "components",
      "components/**/*",
      "wp-content",
      "wp-content/**/*",
      "wp-config.php"
    ],
    {
      cwd: rootPath,
      onlyFiles: false,
      dot: false,
      gitignore: true,
      deep: 5,
      ignore: ["node_modules", "dist", ".git"]
    }
  );
}
