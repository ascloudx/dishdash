import { NextResponse } from "next/server";
import { addBlockedSlot } from "@/lib/bookings";
import { normalizeTimeInput } from "@/lib/time";

interface BlockSlotPayload {
  date?: string;
  time?: string;
  notes?: string;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as BlockSlotPayload;
    const date = payload.date?.trim() ?? "";
    const time = normalizeTimeInput(payload.time ?? "");

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Date must be in YYYY-MM-DD format." }, { status: 400 });
    }

    if (!time) {
      return NextResponse.json({ error: "Time must be in h:mm AM/PM format." }, { status: 400 });
    }

    const booking = await addBlockedSlot({
      date,
      time,
      notes: payload.notes,
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to block slot.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
