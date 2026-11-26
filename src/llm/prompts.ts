/**
 * Loads the system prompts from `src/llm/prompts/*.md`. The files are traced into the API
 * functions via `outputFileTracingIncludes` in `next.config.ts`.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

export type PromptName = "decompose" | "narrate";

const cache = new Map<PromptName, string>();

export function loadPrompt(name: PromptName): string {
  const hit = cache.get(name);
  if (hit !== undefined) return hit;
  const text = readFileSync(path.join(process.cwd(), "src", "llm", "prompts", `${name}.md`), "utf8").trim();
  cache.set(name, text);
  return text;
}

/**
 * User text goes inside delimited blocks and is declared as data in the system prompt (SPEC §8).
 * Removing anything that looks like one of our tags keeps the user from closing a block early.
 */
export function sanitizeUserText(text: string): string {
  return text.replace(/<\/?\s*(intake|process_description|engine_facts|previous_attempt_problems)\b[^>]*>/gi, "");
}
