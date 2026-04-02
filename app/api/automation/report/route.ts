import { NextResponse } from "next/server";
import { ensureAutomationReport } from "@/lib/automation/report";

export async function GET() {
  try {
    const report = await ensureAutomationReport();
    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load automation report.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
