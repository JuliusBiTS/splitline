import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

/** Parses `--name: value;` declarations (comments stripped). */
function parseVars(css: string): Map<string, string> {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const out = new Map<string, string>();
  for (const m of clean.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) out.set(m[1]!, m[2]!.trim());
  return out;
}

const handoff = parseVars(read("../../design/handoff/tokens.css"));
const tokens = parseVars(read("./tokens.css"));
const globals = read("../app/globals.css");

/** Font families come from next/font in code, so they are checked by family name, not 1:1. */
const FONT_VARS = new Set(["font-sans", "font-mono"]);

describe("design tokens match the Claude Design handoff (PLAN Phase 3 acceptance)", () => {
  it("the handoff defines tokens", () => {
    expect(handoff.size).toBeGreaterThan(40);
  });

  for (const [name, value] of handoff) {
    it(`--${name} → --sl-${name}`, () => {
      const ours = tokens.get(`sl-${name}`);
      expect(ours, `missing --sl-${name}`).toBeDefined();
      if (FONT_VARS.has(name)) {
        const family = /'([^']+)'/.exec(value)?.[1];
        expect(ours).toContain(`'${family}'`);
      } else {
        expect(ours!.toLowerCase()).toBe(value.toLowerCase().replace(/var\(--/g, "var(--sl-"));
      }
    });
  }
});

describe("globals.css maps shadcn onto tokens", () => {
  it("has no colour literals (hex, oklch, rgb, hsl)", () => {
    const body = globals.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(body).not.toMatch(/#[0-9a-f]{3,8}\b|oklch\(|rgba?\(|hsla?\(/i);
  });
  it("keeps --muted a surface and secondary text on --muted-foreground", () => {
    const vars = parseVars(globals);
    expect(vars.get("muted")).toBe("var(--sl-subtle)");
    expect(vars.get("muted-foreground")).toBe("var(--sl-secondary)");
  });
  it("has no dark-mode block (light-only design, ADR-0005)", () => {
    expect(globals).not.toMatch(/\.dark\s*\{/);
  });
  it("radius uses the 4 / 8 px scale, not the shadcn default", () => {
    const vars = parseVars(globals);
    expect(vars.get("radius")).toBe("var(--sl-r-card)");
    expect(vars.get("radius-md")).toBe("var(--sl-r-control)");
  });
});

// WCAG 2.x relative luminance and contrast ratio.
function luminance(hex: string): number {
  const n = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255).map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1! + 0.05) / (l2! + 0.05);
}
const t = (name: string) => tokens.get(`sl-${name}`)!;

describe("contrast (WCAG 2.2 AA, 4.5:1 for text)", () => {
  const TEXT = ["ink", "ink-2", "secondary", "accent", "accent-hover"];
  const SURFACES = ["surface", "subtle", "rail", "chip", "accent-tint"];
  for (const fg of TEXT)
    for (const bg of SURFACES)
      it(`${fg} on ${bg}`, () => expect(contrast(t(fg), t(bg))).toBeGreaterThanOrEqual(4.5));

  // `faint` (--sl-muted, #667085) is the lightest text colour and is allowed on neutral surfaces
  // only: on accent-tint it is 4.3:1 (ADR-0005). Use text-muted-foreground on tinted backgrounds.
  for (const bg of ["surface", "subtle", "rail", "chip"])
    it(`muted (faint) on ${bg}`, () => expect(contrast(t("muted"), t(bg))).toBeGreaterThanOrEqual(4.5));
  it("muted (faint) on accent-tint stays below AA, so it is not allowed there", () =>
    expect(contrast(t("muted"), t("accent-tint"))).toBeLessThan(4.5));

  it("white on accent", () => expect(contrast(t("on-accent"), t("accent"))).toBeGreaterThanOrEqual(4.5));
  it("white on ink (selected reason chip)", () => expect(contrast(t("on-accent"), t("ink"))).toBeGreaterThanOrEqual(4.5));

  for (const s of ["applies", "prepare", "regulator", "good", "blocker"])
    it(`status ${s} fg on its bg`, () => expect(contrast(t(`st-${s}`), t(`st-${s}-bg`))).toBeGreaterThanOrEqual(4.5));

  it("drift text on prepare bg", () => expect(contrast(t("drift-text"), t("st-prepare-bg"))).toBeGreaterThanOrEqual(4.5));

  // Non-text UI (WCAG 1.4.11, 3:1). The handoff's off-switch track (placeholder, 2.6:1) fails this,
  // so the Switch uses `faint` (--sl-muted) for the off track instead (ADR-0005 deviation).
  it("placeholder is below 3:1, so it is never the only cue for a control's state", () =>
    expect(contrast(t("placeholder"), t("surface"))).toBeLessThan(3));
  for (const [fg, bg] of [
    ["muted", "surface"],
    ["score-pos", "score-track"],
    ["score-neg", "score-track"],
  ] as const)
    it(`${fg} on ${bg} ≥ 3:1`, () => expect(contrast(t(fg), t(bg))).toBeGreaterThanOrEqual(3));
});
