import { NextResponse } from "next/server";
import { getBookings } from "@/lib/bookings";

export async function GET() {
  try {
    const bookings = await getBookings();
    return NextResponse.json(bookings);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load bookings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
