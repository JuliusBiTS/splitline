import { connection } from "next/server";
import { defaultDeps, handleLiveStatus } from "../_lib/handlers";

export async function GET(): Promise<Response> {
  // Read the environment and the store at request time, not at build time.
  await connection();
  return handleLiveStatus(defaultDeps());
}
