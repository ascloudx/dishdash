import { NextResponse } from "next/server";
import { updateBooking } from "@/lib/bookings";
import { validateBookingUpdates, type BookingUpdateInput } from "@/lib/bookingValidation";

interface UpdateBookingPayload {
  updates: BookingUpdateInput;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as UpdateBookingPayload;

    if (!id?.trim()) {
      return NextResponse.json({ error: "Booking id is required." }, { status: 400 });
    }

    const validated = validateBookingUpdates(payload.updates ?? {});
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const booking = await updateBooking(id, validated.value);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    return NextResponse.json(booking);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update booking.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
