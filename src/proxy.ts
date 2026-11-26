import { NextResponse, type NextRequest } from "next/server";
import { PRESET_SLUGS } from "@/content/presets/slugs";

/**
 * Unknown preset slugs get a real 404 status. The preset page streams its shell before it reads
 * `params` (Cache Components), so `notFound()` there could only render a soft 404 (ADR-0017).
 */
export function proxy(request: NextRequest) {
  const slug = request.nextUrl.pathname.split("/")[2] ?? "";
  if ((PRESET_SLUGS as readonly string[]).includes(slug)) return NextResponse.next();
  return NextResponse.rewrite(new URL("/__unknown-preset", request.url));
}

export const config = { matcher: ["/preset/:slug", "/preset/:slug/charter"] };
