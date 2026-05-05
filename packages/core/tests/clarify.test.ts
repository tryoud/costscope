// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { detectVagueness } from "../src/clarify/detectVagueness.js";
import { refineTask } from "../src/clarify/refineTask.js";
import { parseClarifyResponse } from "../src/clarify/parseClarifyResponse.js";
import { generateQuestions } from "../src/clarify/generateQuestions.js";
import { defaultConfig } from "../src/config/defaultConfig.js";

describe("detectVagueness", () => {
  it("flags 'build a funnel' as vague", () => {
    const result = detectVagueness("build a funnel");
    expect(result.vague).toBe(true);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("flags 'create a landing page' as vague", () => {
    expect(detectVagueness("create a landing page").vague).toBe(true);
  });

  it("does not flag specific tasks", () => {
    const result = detectVagueness("Update the CTA copy in src/components/Hero.astro from 'Sign up' to 'Get started free'");
    expect(result.vague).toBe(false);
  });

  it("flags very short input", () => {
    expect(detectVagueness("fix it").vague).toBe(true);
  });

  it("returns reasons describing why a task is vague", () => {
    const result = detectVagueness("build a system");
    expect(result.reasons.some((r) => r.toLowerCase().includes("broad") || r.toLowerCase().includes("short"))).toBe(true);
  });
});

describe("refineTask", () => {
  it("returns original when no answers", () => {
    expect(refineTask("build a funnel", [])).toBe("build a funnel");
  });

  it("appends each answer as bullet", () => {
    const result = refineTask("build a funnel", [
      { questionId: "q1", question: "Audience?", answer: "B2B SaaS", custom: false },
      { questionId: "q2", question: "Pages?", answer: "Hero + 2 form steps", custom: true }
    ]);
    expect(result).toContain("Clarifications from user:");
    expect(result).toContain("- Audience? → B2B SaaS");
    expect(result).toContain("- Pages? → Hero + 2 form steps");
  });

  it("trims original task", () => {
    expect(refineTask("  build a funnel  ", [])).toBe("build a funnel");
  });
});

describe("parseClarifyResponse", () => {
  const VALID_JSON = JSON.stringify({
    questions: [
      {
        id: "audience",
        question: "Who is the audience?",
        options: [
          { label: "B2B prospects", recommended: true },
          { label: "Direct consumers" },
          { label: "Existing users" }
        ]
      },
      {
        id: "pages",
        question: "How many pages?",
        options: [{ label: "1" }, { label: "2-3", recommended: true }, { label: "5+" }]
      },
      {
        id: "data",
        question: "Where does form data go?",
        options: [
          { label: "Email only", recommended: true },
          { label: "CRM" },
          { label: "Database" }
        ]
      }
    ]
  });

  it("parses valid JSON", () => {
    const result = parseClarifyResponse(VALID_JSON);
    expect(result).toHaveLength(3);
    expect(result[0]?.id).toBe("audience");
  });

  it("strips markdown code fences", () => {
    const wrapped = "```json\n" + VALID_JSON + "\n```";
    expect(parseClarifyResponse(wrapped)).toHaveLength(3);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseClarifyResponse("not json")).toThrow();
  });

  it("throws when fewer than 3 questions", () => {
    const tooFew = JSON.stringify({
      questions: [
        { id: "x", question: "?", options: [{ label: "a" }, { label: "b" }, { label: "c" }] }
      ]
    });
    expect(() => parseClarifyResponse(tooFew)).toThrow();
  });

  it("throws when a question does not have exactly 3 options", () => {
    const bad = JSON.stringify({
      questions: [
        { id: "x", question: "?", options: [{ label: "a" }, { label: "b" }] },
        { id: "y", question: "?", options: [{ label: "a" }, { label: "b" }, { label: "c" }] },
        { id: "z", question: "?", options: [{ label: "a" }, { label: "b" }, { label: "c" }] }
      ]
    });
    expect(() => parseClarifyResponse(bad)).toThrow();
  });

  it("auto-marks first option as recommended when none flagged", () => {
    const noRecommended = JSON.stringify({
      questions: [
        { id: "a", question: "?", options: [{ label: "x" }, { label: "y" }, { label: "z" }] },
        { id: "b", question: "?", options: [{ label: "x" }, { label: "y" }, { label: "z" }] },
        { id: "c", question: "?", options: [{ label: "x" }, { label: "y" }, { label: "z" }] }
      ]
    });
    const result = parseClarifyResponse(noRecommended);
    expect(result[0]?.options[0]?.recommended).toBe(true);
  });

  it("collapses to a single recommended when multiple flagged", () => {
    const tooMany = JSON.stringify({
      questions: [
        {
          id: "a",
          question: "?",
          options: [
            { label: "x", recommended: true },
            { label: "y", recommended: true },
            { label: "z", recommended: true }
          ]
        },
        { id: "b", question: "?", options: [{ label: "x" }, { label: "y" }, { label: "z" }] },
        { id: "c", question: "?", options: [{ label: "x" }, { label: "y" }, { label: "z" }] }
      ]
    });
    const result = parseClarifyResponse(tooMany);
    const recommended = result[0]?.options.filter((o) => o.recommended) ?? [];
    expect(recommended).toHaveLength(1);
  });

  it("extracts JSON from surrounding prose", () => {
    const wrapped = `Here's the result:\n${VALID_JSON}\nThanks!`;
    expect(parseClarifyResponse(wrapped)).toHaveLength(3);
  });
});

describe("generateQuestions", () => {
  const STUB_RESPONSE = JSON.stringify({
    questions: [
      {
        id: "audience",
        question: "Audience?",
        options: [
          { label: "B2B", recommended: true },
          { label: "B2C" },
          { label: "Mixed" }
        ]
      },
      {
        id: "pages",
        question: "Pages?",
        options: [{ label: "1", recommended: true }, { label: "2-3" }, { label: "5+" }]
      },
      {
        id: "data",
        question: "Data?",
        options: [
          { label: "Email", recommended: true },
          { label: "CRM" },
          { label: "DB" }
        ]
      }
    ]
  });

  it("calls the injected llmCaller and parses its response", async () => {
    const result = await generateQuestions({
      task: "build a funnel",
      config: defaultConfig,
      llmCaller: async () => STUB_RESPONSE
    });
    expect(result).toHaveLength(3);
    expect(result[0]?.id).toBe("audience");
  });

  it("passes a system+user message pair to the caller", async () => {
    let captured: { provider: unknown; messages: unknown } | undefined;
    await generateQuestions({
      task: "build a funnel",
      config: defaultConfig,
      llmCaller: async (provider, messages) => {
        captured = { provider, messages };
        return STUB_RESPONSE;
      }
    });
    expect(Array.isArray(captured?.messages)).toBe(true);
    const messages = captured?.messages as Array<{ role: string }>;
    expect(messages.find((m) => m.role === "system")).toBeDefined();
    expect(messages.find((m) => m.role === "user")).toBeDefined();
  });

  it("includes project info in the user prompt when provided", async () => {
    let promptText = "";
    await generateQuestions({
      task: "build a funnel",
      config: defaultConfig,
      projectInfo: {
        rootPath: "/x",
        projectType: "astro",
        packageManager: "pnpm",
        importantPaths: ["src/components/", "src/pages/"],
        detectedFiles: []
      },
      llmCaller: async (_p, messages) => {
        promptText = messages.map((m) => m.content).join("\n");
        return STUB_RESPONSE;
      }
    });
    expect(promptText).toContain("astro");
  });

  it("propagates parser errors", async () => {
    await expect(
      generateQuestions({
        task: "x",
        config: defaultConfig,
        llmCaller: async () => "not json"
      })
    ).rejects.toThrow();
  });
});
