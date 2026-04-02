import { NextResponse } from "next/server";
import { addBooking, deleteBooking, getBookings } from "@/lib/bookings";
import {
  validateBookingInput,
  validateBookingUpdates,
  type BookingFormInput,
  type BookingUpdateInput,
} from "@/lib/bookingValidation";
import { updateBooking } from "@/lib/bookings";

interface UpdateBookingPayload {
  id: string;
  updates: BookingUpdateInput;
}

export async function GET() {
  try {
    const bookings = await getBookings();
    return NextResponse.json(bookings);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load bookings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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

export async function PATCH(request: Request) {
  try {
    const payload = (await request.json()) as UpdateBookingPayload;

    if (!payload.id?.trim()) {
      return NextResponse.json({ error: "Booking id is required." }, { status: 400 });
    }

    const validated = validateBookingUpdates(payload.updates ?? {});
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const booking = await updateBooking(payload.id, validated.value);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    return NextResponse.json(booking);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update booking.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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
