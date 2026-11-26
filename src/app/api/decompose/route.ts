import { defaultDeps, handleDecompose } from "../_lib/handlers";

/** Worst case: 2 attempts × (call + one retry) × 45 s timeout; well under Vercel's 300 s. */
export const maxDuration = 200;

export async function POST(request: Request): Promise<Response> {
  return handleDecompose(request, defaultDeps());
}
