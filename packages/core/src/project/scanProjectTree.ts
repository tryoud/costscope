// SPDX-License-Identifier: Apache-2.0

import { globby } from "globby";

export async function scanProjectTree(rootPath: string): Promise<string[]> {
  return globby(
    [
      "package.json",
      "astro.config.*",
      "next.config.*",
      "vite.config.*",
      "app",
      "pages",
      "src",
      "components",
      "wp-content",
      "wp-config.php"
    ],
    {
      cwd: rootPath,
      onlyFiles: false,
      dot: false,
      gitignore: true,
      deep: 2,
      ignore: ["node_modules", "dist", ".git"]
    }
  );
}
