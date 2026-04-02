import { getBookings } from "./bookings";
import {
  calculateRevenuePerService,
  calculateTotalRevenue,
  getMostPopularService,
  getWeekBookings,
} from "@/utils/calculateRevenue";
import { getTodayDateString } from "@/lib/date";
import { getSettings } from "@/lib/settings";
import { formatTimeTo12Hour, timeToMinutes } from "@/lib/time";
import type { AppSettings } from "@/lib/settings";
import type { Booking } from "@/types/booking";

export interface TimeSlotStat {
  slot: string;
  count: number;
}

export interface AnalyticsData {
  totalRevenue: number;
  weeklyRevenue: number;
  todayRevenue: number;
  revenuePerService: Record<string, number>;
  mostPopularService: string | null;
  busiestTimeSlots: TimeSlotStat[];
  totalBookings: number;
  bookingsToday: number;
  avgRevenuePerBooking: number;
  lowDemandTimeSlots: TimeSlotStat[];
  insights: string[];
}

function toHourSlot(time: string) {
  const totalMinutes = timeToMinutes(time) ?? 0;
  const hourStart = Math.floor(totalMinutes / 60) * 60;
  return formatTimeTo12Hour(`${String(Math.floor(hourStart / 60)).padStart(2, "0")}:${String(hourStart % 60).padStart(2, "0")}`);
}

export function computeAnalytics(bookings: Booking[], settings: AppSettings, today = getTodayDateString()): AnalyticsData {
  const activeBookings = bookings.filter(
    (booking) =>
      booking.type !== "blocked" &&
      booking.status !== "cancelled" &&
      (timeToMinutes(booking.time) ?? -1) >= settings.businessHours.start * 60 &&
      (timeToMinutes(booking.time) ?? -1) < settings.businessHours.end * 60
  );
  const todayBookings = activeBookings.filter((booking) => booking.date === today);
  const weeklyBookings = getWeekBookings(activeBookings, today);
  const revenuePerService = calculateRevenuePerService(activeBookings);
  const slotCounts: Record<string, number> = {};

  for (const booking of activeBookings) {
    const slot = toHourSlot(booking.time);
    slotCounts[slot] = (slotCounts[slot] || 0) + 1;
  }

  const busiestTimeSlots = Object.entries(slotCounts)
    .map(([slot, count]) => ({ slot, count }))
    .sort((a, b) => b.count - a.count);

  const lowDemandTimeSlots = busiestTimeSlots
    .filter((slot) => slot.count > 0)
    .slice()
    .reverse()
    .slice(0, 3);

  const mostPopularService = getMostPopularService(activeBookings);
  const insights = [
    busiestTimeSlots[0]
      ? `${busiestTimeSlots[0].slot} is your busiest hour inside business hours.`
      : null,
    mostPopularService
      ? `${mostPopularService} is your top booked paid service.`
      : null,
    lowDemandTimeSlots[0]
      ? `${lowDemandTimeSlots[0].slot} is lightly booked and worth filling.`
      : null,
  ].filter((insight): insight is string => Boolean(insight));

  return {
    totalRevenue: calculateTotalRevenue(activeBookings),
    weeklyRevenue: calculateTotalRevenue(weeklyBookings),
    todayRevenue: calculateTotalRevenue(todayBookings),
    revenuePerService,
    mostPopularService,
    busiestTimeSlots,
    totalBookings: activeBookings.length,
    bookingsToday: todayBookings.length,
    avgRevenuePerBooking:
      activeBookings.length > 0
        ? Math.round(calculateTotalRevenue(activeBookings) / activeBookings.length)
        : 0,
    lowDemandTimeSlots,
    insights,
  };
}

export async function getAnalytics(): Promise<AnalyticsData> {
  const [bookings, settings] = await Promise.all([getBookings(), getSettings()]);
  return computeAnalytics(bookings, settings);
}
