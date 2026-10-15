import { NextResponse } from "next/server";

/**
 * Saved trips (MASTER_PROMPT §6, signed-in). Accounts and sessions arrive in phase 13, which
 * replaces these handlers with the real CRUD; until then nobody is signed in, so every call is 401
 * and the planner shows "sign in to save".
 */
function unauthorized() {
  return NextResponse.json(
    { error: "unauthorized", message: "Sign in to save trips." },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET() {
  return unauthorized();
}

export async function POST() {
  return unauthorized();
}
