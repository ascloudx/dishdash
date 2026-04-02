import { getBookings } from "./bookings";
import {
  calculateRevenuePerService,
  calculateTotalRevenue,
  getMostPopularService,
  getWeekBookings,
} from "@/utils/calculateRevenue";
import { getTodayDateString } from "@/lib/date";

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
  const hour = Number(time.split(":")[0] ?? "0");
  return `${String(hour).padStart(2, "0")}:00`;
}

export async function getAnalytics(): Promise<AnalyticsData> {
  const bookings = await getBookings();
  const today = getTodayDateString();
  const activeBookings = bookings.filter((booking) => booking.status !== "cancelled");
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
      ? `${busiestTimeSlots[0].slot} is your busiest hour. Consider premium pricing or tighter prep around that window.`
      : "No peak-hour trend yet.",
    mostPopularService
      ? `${mostPopularService} is your top service. Feature it in stories and upsell add-ons around it.`
      : "No service trend yet.",
    lowDemandTimeSlots[0]
      ? `${lowDemandTimeSlots[0].slot} is underbooked. Fill that slot with outreach or same-day offers.`
      : "No gap trend yet.",
  ];

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
