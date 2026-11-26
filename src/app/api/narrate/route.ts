import { defaultDeps, handleNarrate } from "../_lib/handlers";

export const maxDuration = 200;

export async function POST(request: Request): Promise<Response> {
  return handleNarrate(request, defaultDeps());
}
