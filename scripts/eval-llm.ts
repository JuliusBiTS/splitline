/**
 * Live LLM eval (PLAN Phase 5). Costs money: it only runs with a key AND an explicit --confirm flag,
 * and Julius approves every run. Phase 0: guard only, no API calls.
 */
const confirmed = process.argv.includes("--confirm");
const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);

if (!confirmed || !hasKey) {
  console.log(
    "eval:llm calls the real Claude API and costs money. Run `pnpm eval:llm -- --confirm` with ANTHROPIC_API_KEY set, after approval.",
  );
  process.exit(0);
}
console.error("eval:llm is not implemented yet (PLAN Phase 5).");
process.exit(1);
