// SPDX-License-Identifier: Apache-2.0

import { classifyTask } from "../classify/classifyTask.js";
import { defaultConfig } from "../config/defaultConfig.js";
import { routeTask } from "../route/routeTask.js";
import { planFileScope } from "../scope/planFileScope.js";
import type { CostScopeConfig, ExecutionPlan, ExecutionPlanTask, FileScope, MergeRisk, ProjectInfo } from "../types.js";

const sectionTasks = [
  { token: "hero", label: "Add or update hero section" },
  { token: "faq", label: "Add or update FAQ section" },
  { token: "pricing", label: "Add or update pricing section" },
  { token: "testimonial", label: "Add or update testimonials section" },
  { token: "contact", label: "Add or update contact section" }
] as const;

export function planExecution(goal: string, projectInfo: ProjectInfo, config: CostScopeConfig = defaultConfig): ExecutionPlan {
  const subTasks = inferSubTasks(goal);
  const tasks = subTasks.map((task, index) => planTask(task, index, projectInfo, config));
  const dependencyIds = tasks.filter((task) => task.dependsOn.length === 0).map((task) => task.id);
  const finalTasks = tasks.map((task) => ({
    ...task,
    dependsOn: task.dependsOn.includes("*") ? dependencyIds : task.dependsOn
  }));
  const parallelGroups = buildParallelGroups(finalTasks);

  return {
    goal,
    projectInfo,
    tasks: finalTasks,
    parallelGroups,
    reason: subTasks.length === 1
      ? ["Goal is narrow enough to run as a single scoped task."]
      : ["Goal was split into scoped mini-tasks. Independent low-merge-risk tasks share a parallel group."]
  };
}

function inferSubTasks(goal: string): string[] {
  const normalized = goal.toLowerCase();
  const found = sectionTasks.filter((entry) => normalized.includes(entry.token)).map((entry) => entry.label);

  if (found.length > 0) {
    const needsComposition = found.length > 1 || normalized.includes("landing") || normalized.includes("homepage") || normalized.includes("website");
    return needsComposition ? [...found, "Wire updated sections into the page composition"] : found;
  }

  if (looksLarge(normalized)) {
    return [
      `Inspect the existing implementation for: ${goal}`,
      `Implement the lowest-risk isolated change for: ${goal}`,
      `Add or update focused tests or documentation for: ${goal}`
    ];
  }

  return [goal];
}

function looksLarge(normalizedGoal: string): boolean {
  return [
    "build",
    "create",
    "implement",
    "refactor",
    "migrate",
    "redesign",
    "production",
    "app",
    "flow",
    "system"
  ].some((token) => normalizedGoal.includes(token));
}

function planTask(task: string, index: number, projectInfo: ProjectInfo, config: CostScopeConfig): ExecutionPlanTask {
  const classification = classifyTask(task, projectInfo);
  const fileScope = narrowMiniTaskScope(task, planFileScope(task, projectInfo, config));
  const route = routeTask(classification, fileScope, config);
  const mergeRisk = mergeRiskFor(fileScope);
  const isComposition = task.toLowerCase().includes("composition") || task.toLowerCase().includes("wire ");

  return {
    id: taskId(task, index),
    task,
    dependsOn: isComposition ? ["*"] : [],
    parallelGroup: isComposition ? "integration" : mergeRisk === "low" ? "parallel-a" : `serial-${index + 1}`,
    parallelizable: !isComposition && mergeRisk === "low" && route.autoRunAllowed,
    mergeRisk,
    classification,
    fileScope,
    route,
    reason: [
      mergeRisk === "low" ? "File scope appears isolated." : "File scope may overlap with other work.",
      route.autoRunAllowed ? "Route allows automatic worker execution." : "Route requires confirmation or review."
    ]
  };
}

function narrowMiniTaskScope(task: string, fileScope: FileScope): FileScope {
  const token = sectionTasks.find((entry) => task.toLowerCase().includes(entry.token))?.token;
  if (!token) return fileScope;

  const focusedFiles = fileScope.allowedFiles.filter((file) => file.toLowerCase().includes(token));
  if (focusedFiles.length === 0) return fileScope;

  return {
    ...fileScope,
    allowedFiles: focusedFiles,
    maybeFiles: [...new Set([...fileScope.maybeFiles, ...fileScope.allowedFiles.filter((file) => !focusedFiles.includes(file))])],
    reason: [...fileScope.reason, "Narrowed section mini-task to its component so composition can run as a separate dependent task."]
  };
}

function buildParallelGroups(tasks: ExecutionPlanTask[]) {
  const groups = new Map<string, ExecutionPlanTask[]>();
  for (const task of tasks) {
    const existing = groups.get(task.parallelGroup) ?? [];
    existing.push(task);
    groups.set(task.parallelGroup, existing);
  }

  return [...groups.entries()].map(([id, groupTasks]) => ({
    id,
    taskIds: groupTasks.map((task) => task.id),
    canRunInParallel: id.startsWith("parallel") && groupTasks.length > 1,
    reason: id.startsWith("parallel")
      ? ["Tasks in this group have low merge risk and no explicit dependencies."]
      : ["Tasks in this group should run after dependencies or with manual sequencing."]
  }));
}

function mergeRiskFor(fileScope: FileScope): MergeRisk {
  if (fileScope.allowedFiles.length === 0) return "high";
  if (fileScope.allowedFiles.some((file) => isSharedCompositionFile(file))) return "medium";
  if (fileScope.allowedFiles.length > 4) return "medium";
  return "low";
}

function isSharedCompositionFile(file: string): boolean {
  return file.endsWith("index.astro") || file.endsWith("page.tsx") || file.endsWith("layout.tsx") || file.endsWith("global.css");
}

function taskId(task: string, index: number): string {
  const slug = task.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32);
  return `${index + 1}-${slug || "task"}`;
}
