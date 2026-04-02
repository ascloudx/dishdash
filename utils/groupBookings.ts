import type { Booking } from "@/types/booking";
import { addDaysToDateString } from "@/lib/date";

/**
 * Groups an array of bookings by date (YYYY-MM-DD),
 * sorting each group by time ascending.
 */
export function groupBookingsByDate(
  bookings: Booking[]
): Record<string, Booking[]> {
  const groups: Record<string, Booking[]> = {};

  for (const booking of bookings) {
    if (!groups[booking.date]) {
      groups[booking.date] = [];
    }
    groups[booking.date].push(booking);
  }

  // Sort each group by time
  for (const date in groups) {
    groups[date].sort((a, b) => a.time.localeCompare(b.time));
  }

  return groups;
}

/**
 * Returns bookings for a specific date, sorted by time.
 */
export function getBookingsForDate(
  bookings: Booking[],
  date: string
): Booking[] {
  return bookings
    .filter((b) => b.date === date)
    .sort((a, b) => a.time.localeCompare(b.time));
}

/**
 * Returns bookings for a week starting from the given date.
 */
export function getBookingsForWeek(
  bookings: Booking[],
  startDate: string
): Record<string, Booking[]> {
  const weekDates: string[] = [];

  for (let i = 0; i < 7; i++) {
    weekDates.push(addDaysToDateString(startDate, i));
  }

  const result: Record<string, Booking[]> = {};
  for (const date of weekDates) {
    result[date] = bookings
      .filter((b) => b.date === date && b.status !== "cancelled")
      .sort((a, b) => a.time.localeCompare(b.time));
  }

  return result;
}
