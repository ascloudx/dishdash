import { getTodayDateString, getHoursUntil } from "@/lib/date";
import { compareTimeStrings, isTimeWithinHours, normalizeTimeInput, timeToMinutes } from "@/lib/time";
import type { Booking } from "@/types/booking";

export interface CalendarGap {
  slot: string;
  priorityScore: number;
}

function buildSlots(startHour: number, endHour: number, slotDuration: number) {
  const slots: string[] = [];

  for (let minutes = startHour * 60; minutes < endHour * 60; minutes += slotDuration) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const normalized = normalizeTimeInput(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    if (normalized) {
      slots.push(normalized);
    }
  }

  return slots;
}

export function detectGaps(params: {
  bookings: Booking[];
  businessHours: { start: number; end: number };
  slotDuration: number;
  date?: string;
  slots?: string[];
}): CalendarGap[] {
  const date = params.date ?? getTodayDateString();
  const activeBookings = params.bookings.filter(
    (booking) =>
      booking.type !== "blocked" &&
      booking.status !== "cancelled" &&
      booking.date === date &&
      isTimeWithinHours(booking.time, params.businessHours.start, params.businessHours.end)
  );
  const visibleSlots = (params.slots && params.slots.length > 0
    ? params.slots
    : buildSlots(params.businessHours.start, params.businessHours.end, params.slotDuration)
  )
    .map((slot) => normalizeTimeInput(slot))
    .filter((slot): slot is string => Boolean(slot))
    .filter((slot) => isTimeWithinHours(slot, params.businessHours.start, params.businessHours.end))
    .sort(compareTimeStrings);
  const bookedSlots = new Set(activeBookings.map((booking) => booking.time));

  return visibleSlots
    .filter((slot) => !bookedSlots.has(slot))
    .map((slot) => {
      const hoursUntil = getHoursUntil(date, slot);
      const slotMinutes = timeToMinutes(slot) ?? 0;
      const middayDistance = Math.abs(slotMinutes - 15 * 60);
      const urgencyScore =
        hoursUntil >= 0 ? Math.max(0, 40 - Math.round(hoursUntil * 8)) : 5;
      const demandWindowScore = Math.max(0, 25 - Math.round(middayDistance / 30));

      return {
        slot,
        priorityScore: urgencyScore + demandWindowScore,
      };
    })
    .sort((left, right) => right.priorityScore - left.priorityScore || compareTimeStrings(left.slot, right.slot));
}
