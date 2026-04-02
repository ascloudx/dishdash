import { NextResponse } from "next/server";
import { deleteBooking } from "@/lib/bookings";

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id")?.trim() ?? "";

    if (!id) {
      return NextResponse.json({ error: "Booking id is required." }, { status: 400 });
    }

    const deleted = await deleteBooking(id);
    if (!deleted) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete booking.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
