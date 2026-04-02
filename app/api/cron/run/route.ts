import { NextResponse } from "next/server";
import { runAutomationCycle } from "@/lib/cron/runner";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    throw new Error("CRON_SECRET is not configured.");
  }

  const { searchParams } = new URL(request.url);
  return searchParams.get("key") === secret;
}

export async function GET(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const report = await runAutomationCycle();
    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to run automation cycle.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
