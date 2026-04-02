import { NextResponse } from "next/server";
import { runAutomationCycle } from "@/lib/cron/runner";

export async function GET() {
  try {
    const report = await runAutomationCycle();
    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to run daily automation cycle.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
