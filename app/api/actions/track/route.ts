import { NextResponse } from "next/server";
import type { MissedOpportunity } from "@/lib/engagement/types";
import { trackBehavior, type ActionEvent } from "@/lib/intelligence/behaviorTracker";
import { getTodayDateString } from "@/lib/date";

interface TrackPayload {
  date?: string;
  briefSummary?: string;
  missedOpportunities?: MissedOpportunity[];
  events: ActionEvent[];
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as TrackPayload;

    if (!Array.isArray(payload.events) || payload.events.length === 0) {
      return NextResponse.json({ error: "At least one event is required." }, { status: 400 });
    }

    const entry = await trackBehavior({
      date: payload.date ?? getTodayDateString(),
      briefSummary: payload.briefSummary,
      missedOpportunities: payload.missedOpportunities,
      events: payload.events,
    });

    return NextResponse.json(entry);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to track action.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
