"use client";

import type { Booking } from "@/types/booking";
import type { BookingFormInput } from "@/lib/bookingValidation";

export async function submitBooking(input: BookingFormInput): Promise<Booking> {
  const response = await fetch("/api/bookings/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload = (await response.json()) as Booking | { error: string };
  if (!response.ok || "error" in payload) {
    throw new Error("error" in payload ? payload.error : "Failed to create booking.");
  }

  return payload;
}
