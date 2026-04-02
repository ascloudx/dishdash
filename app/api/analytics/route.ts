import { getAnalytics } from "@/lib/analytics";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const analytics = await getAnalytics();
    return NextResponse.json(analytics);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load analytics.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
