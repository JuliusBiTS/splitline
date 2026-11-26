/** Public base URL for charters and share links (`NEXT_PUBLIC_SITE_URL`, inlined at build time). */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}
