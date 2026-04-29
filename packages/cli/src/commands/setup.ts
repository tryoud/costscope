// SPDX-License-Identifier: Apache-2.0

import { appendFile, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { detectProject, writeConfig } from "@costscope/core";
import { MODEL_PRESETS, applyPreset } from "@costscope/core";
import { defaultConfig } from "@costscope/core";
import type { ModelPreset } from "@costscope/core";

export interface SetupResult {
  configPath: string;
  preset: ModelPreset;
  keysWritten: boolean;
  shellFile?: string;
}

const PRESET_INFO: Record<ModelPreset, { label: string; hint: string; keys: string[] }> = {
  default: {
    label: "default",
    hint: "Balanced quality / cost — OpenRouter + Anthropic for premium",
    keys: ["OPENROUTER_API_KEY", "MISTRAL_API_KEY", "ANTHROPIC_API_KEY"]
  },
  student: {
    label: "student  ~53% off via Mistral le Chat Pro",
    hint: "Max value — vibe (Devstral 2) · Qwen · DeepSeek, no Anthropic billing",
    keys: ["MISTRAL_API_KEY", "OPENROUTER_API_KEY"]
  },
  quality: {
    label: "quality",
    hint: "Anthropic-only — Haiku for balanced, Sonnet for premium",
    keys: ["ANTHROPIC_API_KEY", "MISTRAL_API_KEY"]
  }
};

const KEY_INFO: Record<string, { label: string; hint: string; url: string; required: ModelPreset[] }> = {
  MISTRAL_API_KEY: {
    label: "Mistral Codestral key",
    hint: "le Chat Pro → Studio › Codestral › API keys  (used by vibe CLI)",
    url: "https://console.mistral.ai/codestral",
    required: ["default", "student", "quality"]
  },
  OPENROUTER_API_KEY: {
    label: "OpenRouter key",
    hint: "openrouter.ai/keys  (covers Gemini · DeepSeek · Qwen)",
    url: "https://openrouter.ai/keys",
    required: ["default", "student"]
  },
  ANTHROPIC_API_KEY: {
    label: "Anthropic key",
    hint: "console.anthropic.com/keys  (only needed for premium / quality preset)",
    url: "https://console.anthropic.com/keys",
    required: ["default", "quality"]
  }
};

export async function setupWizard(options: { root: string; force?: boolean }): Promise<SetupResult> {
  console.log("");
  p.intro(`${pc.bgCyan(pc.black("  CostScope  "))} ${pc.dim("setup wizard")}`);

  // ── Preset ──────────────────────────────────────────────────────────────
  const preset = await p.select<ModelPreset>({
    message: "Which preset fits your setup?",
    options: (["default", "student", "quality"] as ModelPreset[]).map((id) => ({
      value: id,
      label: PRESET_INFO[id].label,
      hint: PRESET_INFO[id].hint
    }))
  });
  if (p.isCancel(preset)) { p.cancel("Setup cancelled."); process.exit(0); }

  const presetKeys = PRESET_INFO[preset].keys;

  p.note(
    [
      `Workers: ${workerSummary(preset)}`,
      `Keys needed: ${presetKeys.join(", ")}`
    ].join("\n"),
    "Preset summary"
  );

  // ── API Keys ─────────────────────────────────────────────────────────────
  const collectedKeys: Record<string, string> = {};

  for (const keyName of presetKeys) {
    const info = KEY_INFO[keyName];
    if (!info) continue;

    const existing = process.env[keyName];
    if (existing) {
      p.log.success(`${pc.cyan(keyName)} already set in environment — skipping`);
      collectedKeys[keyName] = existing;
      continue;
    }

    const value = await p.text({
      message: `${info.label}  ${pc.dim(info.hint)}`,
      placeholder: "paste key here (input is hidden in logs)",
      validate: (v) => {
        if (!v.trim()) return `${keyName} is required for the ${preset} preset`;
      }
    });
    if (p.isCancel(value)) { p.cancel("Setup cancelled."); process.exit(0); }
    collectedKeys[keyName] = value.trim();
  }

  // ── Shell config ─────────────────────────────────────────────────────────
  const shellFile = detectShellRc();
  const exportLines = Object.entries(collectedKeys)
    .filter(([, v]) => !process.env[v])
    .map(([k, v]) => `export ${k}="${v}"`)
    .join("\n");

  let keysWritten = false;
  if (exportLines) {
    const writeChoice = await p.select({
      message: `Add keys to ${pc.cyan(path.basename(shellFile))}?`,
      options: [
        { value: "write", label: `Yes — append export lines to ${shellFile}`, hint: "recommended" },
        { value: "print", label: "No — show export commands only" }
      ]
    });
    if (p.isCancel(writeChoice)) { p.cancel("Setup cancelled."); process.exit(0); }

    if (writeChoice === "write") {
      await appendExportsToRc(shellFile, collectedKeys);
      keysWritten = true;
      p.log.success(`Keys written to ${shellFile}`);
    } else {
      p.note(
        Object.entries(collectedKeys).map(([k, v]) => `export ${k}="${v}"`).join("\n"),
        "Add these to your shell config"
      );
    }
  }

  // ── Write config ─────────────────────────────────────────────────────────
  const s = p.spinner();
  s.start("Detecting project and writing config…");

  const project = await detectProject(options.root);
  const providers = applyPreset(preset, undefined);
  const config = {
    ...defaultConfig,
    preset,
    providers,
    project: { ...defaultConfig.project, type: project.projectType },
    commands: {
      ...defaultConfig.commands,
      build: project.buildCommand ?? null,
      lint: project.lintCommand ?? null,
      test: project.testCommand ?? null
    }
  };

  const configPath = await writeConfig(options.root, config, Boolean(options.force));
  s.stop(`Config written to ${pc.cyan(configPath)}`);

  // ── Outro ─────────────────────────────────────────────────────────────────
  p.outro(
    [
      pc.green("✓ CostScope is ready."),
      "",
      `  ${pc.dim("Try:")}  ${pc.cyan(`costscope run --dry-run "Update README"`)}`,
      `  ${pc.dim("Docs:")} ${pc.cyan("docs/student-preset.md")}  ${pc.dim("(if you chose student)")}`,
      keysWritten ? `\n  ${pc.dim("Reload your shell:")} ${pc.cyan(`source ${shellFile}`)}` : ""
    ]
      .filter((l) => l !== undefined)
      .join("\n")
  );

  return { configPath, preset, keysWritten, shellFile: keysWritten ? shellFile : undefined };
}

function workerSummary(preset: ModelPreset): string {
  const map: Record<ModelPreset, string> = {
    default: "vibe · deepseek-chat · claude-sonnet-4-6",
    student: "vibe (Devstral 2) · qwen-2.5-coder-32b · deepseek-r1",
    quality: "vibe · claude-haiku-4-5 · claude-sonnet-4-6"
  };
  return map[preset];
}

function detectShellRc(): string {
  const shell = process.env["SHELL"] ?? "";
  if (shell.includes("zsh")) return path.join(os.homedir(), ".zshrc");
  if (shell.includes("fish")) return path.join(os.homedir(), ".config", "fish", "config.fish");
  return path.join(os.homedir(), ".bashrc");
}

async function appendExportsToRc(rcFile: string, keys: Record<string, string>): Promise<void> {
  const lines = [
    "",
    "# CostScope API keys",
    ...Object.entries(keys).map(([k, v]) => `export ${k}="${v}"`)
  ].join("\n") + "\n";

  // avoid duplicates
  let existing = "";
  try { existing = await readFile(rcFile, "utf8"); } catch { /* file may not exist */ }

  const toAppend = Object.entries(keys)
    .filter(([k]) => !existing.includes(`export ${k}=`))
    .map(([k, v]) => `export ${k}="${v}"`);

  if (toAppend.length === 0) return;

  await appendFile(rcFile, ["", "# CostScope API keys", ...toAppend].join("\n") + "\n", "utf8");
}
