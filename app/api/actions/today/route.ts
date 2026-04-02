import { NextResponse } from "next/server";
import { getTodayActions } from "@/lib/actions";

export async function GET() {
  try {
    const actions = await getTodayActions();
    return NextResponse.json(actions);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load actions.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
