import { NextResponse } from "next/server";
import { getAutomationReport } from "@/lib/automation/state";

export async function GET() {
  try {
    const results =
      (await getAutomationReport()) ?? {
        generatedAt: null,
        reminders: [],
        reactivations: [],
        insights: [],
      };

    return NextResponse.json(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load automation results.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
