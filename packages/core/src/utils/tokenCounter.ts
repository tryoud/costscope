// SPDX-License-Identifier: Apache-2.0

/**
 * Token counting utilities for various LLM providers.
 * Uses simplified token counting that approximates real tokenizer behavior.
 */

// Character to token ratios for different encodings
// These are approximations based on average token lengths
const TOKEN_RATIOS: Record<string, number> = {
  // Mistral models use cl100k_base tokenizer (similar to o200k_base)
  // Average: ~4 chars per token for English text
  "mistral": 4.0,
  "codestral": 3.8,
  "deepseek": 4.0,
  "claude": 4.5,
  "gpt": 4.0,
  "gemini": 4.2,
  // Default fallback
  "default": 4.0
};

// Known token counts for common patterns (to improve accuracy)
const KNOWN_TOKENS: Record<string, number> = {
  // Common words
  "the": 1, "be": 1, "to": 1, "of": 1, "and": 1, "a": 1, "in": 1, "that": 1,
  "have": 1, "I": 1, "it": 1, "for": 1, "not": 1, "on": 1, "with": 1, "he": 1,
  "as": 1, "you": 1, "do": 1, "at": 1, "this": 1, "but": 1, "his": 1, "by": 1,
  "from": 1, "they": 1, "we": 1, "say": 1, "her": 1, "she": 1, "or": 1, "an": 1,
  "will": 1, "my": 1, "one": 1, "all": 1, "would": 1, "there": 1, "their": 1,
  "what": 1, "so": 1, "up": 1, "out": 1, "if": 1, "about": 1, "who": 1, "get": 1,
  "which": 1, "go": 1, "me": 1, "when": 1, "make": 1, "can": 1, "like": 1,
  "time": 1, "no": 1, "just": 1, "him": 1, "know": 1, "take": 1, "people": 1,
  "into": 1, "year": 1, "your": 1, "good": 1, "some": 1, "could": 1, "them": 1,
  "see": 1, "other": 1, "than": 1, "then": 1, "now": 1, "look": 1, "only": 1,
  "come": 1, "its": 1, "over": 1, "think": 1, "also": 1, "back": 1, "after": 1,
  "use": 1, "two": 1, "how": 1, "our": 1, "work": 1, "first": 1, "well": 1,
  "way": 1, "even": 1, "new": 1, "want": 1, "because": 1, "any": 1, "these": 1,
  "give": 1, "day": 1, "most": 1, "us": 1,
  // Code symbols (often single tokens)
  "(": 1, ")": 1, "[": 1, "]": 1, "{": 1, "}": 1, "<": 1, ">": 1,
  ";": 1, ":": 1, ",": 1, ".": 1, "=": 1, "+": 1, "-": 1, "*": 1, "/": 1,
  "\n": 1, "\t": 1, " ": 0  // Space is typically free in tokenization
};

/**
 * Get the token ratio for a given model.
 * Mistral/Codestral models typically use ~4 chars per token.
 */
function getTokenRatio(model: string): number {
  const lowerModel = model.toLowerCase();
  for (const [key, ratio] of Object.entries(TOKEN_RATIOS)) {
    if (lowerModel.includes(key)) {
      return ratio;
    }
  }
  // Default to 4.0 tokens per character ratio
  return 4.0;
}

/**
 * Count tokens in a string using a simplified approach.
 * This approximates the cl100k_base tokenizer used by Mistral models.
 * 
 * For more accuracy, use the tiktoken library:
 * ```
 * import { get_encoding } from "tiktoken";
 * const encoding = get_encoding("cl100k_base");
 * const tokens = encoding.encode(text).length;
 * ```
 */
export function countTokens(text: string, model?: string): number {
  if (!text || text.length === 0) return 0;
  
  const ratio = getTokenRatio(model ?? "");
  
  // Use known token counts for common patterns
  const words = text.split(/(\s+)/);
  let tokenCount = 0;
  
  for (const word of words) {
    if (/^\s+$/.test(word)) {
      // Whitespace sequences count as one token
      tokenCount += 1;
      continue;
    }
    
    const lowerWord = word.toLowerCase();
    if (KNOWN_TOKENS[lowerWord] !== undefined) {
      tokenCount += KNOWN_TOKENS[lowerWord];
    } else {
      // For unknown words, use character-based estimation
      // Add some overhead for subword tokenization
      const chars = word.length;
      tokenCount += Math.ceil(chars / ratio);
    }
  }
  
  return Math.max(1, tokenCount);
}

/**
 * Count tokens in multiple strings (e.g., prompt + response).
 */
export function countTokensTotal(strings: string[], model?: string): number {
  return strings.reduce((sum, str) => sum + countTokens(str, model), 0);
}

/**
 * Estimate token count for a chat message (prompt + response).
 */
export function estimateMessageTokens(prompt: string, response: string, model?: string): number {
  return countTokens(prompt, model) + countTokens(response, model);
}
