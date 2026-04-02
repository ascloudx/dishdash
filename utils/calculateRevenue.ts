import type { Booking } from "@/types/booking";
import { addDaysToDateString, getWeekStartDateString } from "@/lib/date";
import { filterCompletedRevenueBookings } from "@/lib/bookings";

export function calculateTotalRevenue(bookings: Booking[]): number {
  return filterCompletedRevenueBookings(bookings).reduce((sum, booking) => sum + booking.price, 0);
}

export function calculateRevenuePerService(bookings: Booking[]): Record<string, number> {
  const result: Record<string, number> = {};

  for (const booking of filterCompletedRevenueBookings(bookings)) {
    result[booking.serviceName] = (result[booking.serviceName] || 0) + booking.price;
  }

  return result;
}

export function getMostPopularService(bookings: Booking[]): string | null {
  const counts: Record<string, number> = {};

  for (const booking of filterCompletedRevenueBookings(bookings)) {
    counts[booking.serviceId] = (counts[booking.serviceId] || 0) + 1;
  }

  const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!winner) {
    return null;
  }

  const booking = bookings.find((entry) => entry.serviceId === winner);
  return booking?.serviceName ?? null;
}

export function getTodayBookings(bookings: Booking[], today: string) {
  return bookings.filter((booking) => booking.date === today && booking.status !== "cancelled");
}

export function getWeekBookings(bookings: Booking[], referenceDate: string) {
  const start = getWeekStartDateString(referenceDate);
  const weekDates = new Set<string>();

  for (let index = 0; index < 7; index += 1) {
    weekDates.add(addDaysToDateString(start, index));
  }

  return bookings.filter((booking) => weekDates.has(booking.date) && booking.status !== "cancelled");
}
