import { NextResponse } from "next/server";
import { addBooking } from "@/lib/bookings";
import { validateBookingInput, type BookingFormInput } from "@/lib/bookingValidation";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as BookingFormInput;
    const validated = validateBookingInput(payload);

    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const booking = await addBooking(validated.value);
    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create booking.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
