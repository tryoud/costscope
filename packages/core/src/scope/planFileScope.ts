// SPDX-License-Identifier: Apache-2.0

import type { FileScope, ProjectInfo, CostScopeConfig } from "../types.js";
import { classifyTask } from "../classify/classifyTask.js";
import { defaultConfig } from "../config/defaultConfig.js";
import { cheapModeForbiddenFiles, defaultForbiddenFiles } from "./forbiddenFiles.js";
import { keywordTokens, likelyDirectories } from "./fileScopeRules.js";
import { maybeExisting, uniquePaths } from "./pathMatchers.js";
import { validateFileScope } from "./validateFileScope.js";

export function planFileScope(task: string, projectInfo: ProjectInfo, config: CostScopeConfig = defaultConfig): FileScope {
  const classification = classifyTask(task, projectInfo);
  const normalized = task.toLowerCase();
  const forbidden = [
    ...defaultForbiddenFiles,
    ...config.guardrails.forbiddenFiles,
    ...(classification.tier === "cheap" ? cheapModeForbiddenFiles : [])
  ];
  const reason = [`Using ${projectInfo.projectType} project preset.`, `Task classified as ${classification.risk}/${classification.tier}.`];

  if (projectInfo.projectType === "astro") {
    return validateFileScope(planAstro(normalized, projectInfo, forbidden, reason));
  }
  if (projectInfo.projectType === "nextjs") {
    return validateFileScope(planNext(normalized, projectInfo, forbidden, reason));
  }
  if (projectInfo.projectType === "wordpress") {
    return validateFileScope(planWordPress(normalized, projectInfo, forbidden, reason));
  }
  return validateFileScope(planGeneric(normalized, task, projectInfo, forbidden, reason));
}

function planAstro(task: string, projectInfo: ProjectInfo, forbidden: string[], reason: string[]): FileScope {
  if (task.includes("faq")) {
    return {
      allowedFiles: uniquePaths([
        "src/components/sections/FAQ.astro",
        ...maybeExisting(projectInfo.detectedFiles, ["src/content/site.json", "src/pages/index.astro"])
      ]),
      maybeFiles: maybeExisting(projectInfo.detectedFiles, ["src/styles/global.css"]),
      forbiddenFiles: forbidden,
      reason: [...reason, "FAQ tasks are scoped to the FAQ section, homepage, and site content when present."]
    };
  }
  if (task.includes("pricing")) {
    return {
      allowedFiles: uniquePaths([
        "src/components/sections/Pricing.astro",
        ...maybeExisting(projectInfo.detectedFiles, ["src/content/site.json", "src/pages/index.astro"])
      ]),
      maybeFiles: maybeExisting(projectInfo.detectedFiles, ["src/styles/global.css"]),
      forbiddenFiles: forbidden,
      reason: [...reason, "Pricing tasks are scoped to pricing section/content and homepage composition."]
    };
  }
  if (task.includes("hero")) {
    return {
      allowedFiles: uniquePaths([
        "src/components/sections/Hero.astro",
        ...maybeExisting(projectInfo.detectedFiles, ["src/content/site.json", "src/pages/index.astro"])
      ]),
      maybeFiles: maybeExisting(projectInfo.detectedFiles, ["src/styles/global.css"]),
      forbiddenFiles: forbidden,
      reason: [...reason, "Hero tasks are scoped to hero section/content and homepage composition."]
    };
  }
  if (task.includes("contact") && task.includes("form")) {
    return {
      allowedFiles: ["src/components/sections/Contact.astro"],
      maybeFiles: uniquePaths(["src/pages/api/contact.ts", "src/utils/email.ts", ".env.example"]),
      forbiddenFiles: forbidden,
      reason: [...reason, "Contact forms may need an API route or email utility, so non-component files require review."]
    };
  }
  return planGeneric(task, task, projectInfo, forbidden, reason);
}

function planNext(task: string, projectInfo: ProjectInfo, forbidden: string[], reason: string[]): FileScope {
  if (task.includes("login") || task.includes("auth") || task.includes("oauth") || task.includes("session")) {
    return {
      allowedFiles: [],
      maybeFiles: uniquePaths(["app/api/auth/**", "lib/auth/**", "middleware.ts", ".env.example"]),
      forbiddenFiles: forbidden,
      reason: [...reason, "Auth work is high risk and requires premium/manual review before allowing concrete files."]
    };
  }

  if (task.includes("api route") || task.includes("api endpoint") || task.includes("server action")) {
    return {
      allowedFiles: [],
      maybeFiles: uniquePaths(["app/api/**", "lib/api/**", "lib/db.ts"]),
      forbiddenFiles: forbidden,
      reason: [...reason, "API route tasks require review; the specific route file is unknown without more context."]
    };
  }

  if (
    task.includes("component") || task.includes("button") || task.includes("modal") ||
    task.includes("banner") || task.includes("card") || task.includes("navbar") ||
    task.includes("header") || task.includes("footer")
  ) {
    const componentFiles = projectInfo.detectedFiles
      .filter((f) => f.startsWith("components/") || (f.startsWith("app/") && (f.endsWith(".tsx") || f.endsWith(".module.css"))))
      .slice(0, 8);
    return {
      allowedFiles: componentFiles,
      maybeFiles: uniquePaths(["components/**", "app/**/*.module.css"]),
      forbiddenFiles: forbidden,
      reason: [...reason, "Component tasks scoped to components/ and CSS modules."]
    };
  }

  if (task.includes("middleware") || task.includes("redirect") || task.includes("rewrite")) {
    return {
      allowedFiles: maybeExisting(projectInfo.detectedFiles, ["middleware.ts"]),
      maybeFiles: uniquePaths(["lib/middleware/**"]),
      forbiddenFiles: forbidden,
      reason: [...reason, "Middleware tasks scoped to middleware.ts only."]
    };
  }

  if (
    task.includes("database") || task.includes("migration") || task.includes("schema") ||
    task.includes("prisma") || task.includes("drizzle")
  ) {
    return {
      allowedFiles: [],
      maybeFiles: uniquePaths(["prisma/**", "drizzle/**", "lib/db.ts", "lib/db/**", "migrations/**"]),
      forbiddenFiles: forbidden,
      reason: [...reason, "Database tasks require review; schema changes can have irreversible consequences."]
    };
  }

  return planGeneric(task, task, projectInfo, forbidden, reason);
}

function planWordPress(task: string, projectInfo: ProjectInfo, forbidden: string[], reason: string[]): FileScope {
  if (task.includes("shortcode")) {
    return {
      allowedFiles: uniquePaths(projectInfo.detectedFiles.filter((file) => file.startsWith("wp-content/plugins/") && file.endsWith(".php"))),
      maybeFiles: uniquePaths(["wp-content/plugins/**/*.css", "wp-content/plugins/**/*.js"]),
      forbiddenFiles: uniquePaths([...forbidden, ".htaccess"]),
      reason: [...reason, "Shortcode work should stay inside plugin PHP/assets and avoid production config."]
    };
  }
  return planGeneric(task, task, projectInfo, forbidden, reason);
}

function planGeneric(normalizedTask: string, originalTask: string, projectInfo: ProjectInfo, forbidden: string[], reason: string[]): FileScope {
  const tokens = keywordTokens(originalTask);
  const matches = projectInfo.detectedFiles.filter((file) => {
    const lower = file.toLowerCase();
    return tokens.some((token) => lower.includes(token));
  });

  if (matches.length > 0) {
    return {
      allowedFiles: matches.slice(0, 8),
      maybeFiles: likelyDirectories(projectInfo),
      forbiddenFiles: forbidden,
      reason: [...reason, "Matched existing files by task keywords."]
    };
  }

  return {
    allowedFiles: [],
    maybeFiles: likelyDirectories(projectInfo),
    forbiddenFiles: forbidden,
    reason: [...reason, "No clear file match found; keep allowed files empty and require confirmation."]
  };
}
