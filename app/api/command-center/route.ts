import { NextResponse } from "next/server";
import { getCommandCenterActions } from "@/lib/commandCenter";

export async function GET() {
  try {
    const actions = await getCommandCenterActions();
    return NextResponse.json(actions);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load command center.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
