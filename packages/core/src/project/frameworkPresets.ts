// SPDX-License-Identifier: Apache-2.0

import type { ProjectType } from "../types.js";

export const importantPathPresets: Record<ProjectType, string[]> = {
  astro: ["src/pages", "src/components", "src/content", "src/layouts", "src/styles"],
  nextjs: ["app", "pages", "components", "lib", "src", "prisma"],
  vite: ["src", "components", "public"],
  react: ["src", "components", "public"],
  wordpress: ["wp-content/themes", "wp-content/plugins"],
  node: ["src", "lib", "test", "tests"],
  generic: ["src", "lib", "docs"]
};
