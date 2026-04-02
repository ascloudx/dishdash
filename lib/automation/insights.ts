import { BUSINESS } from "@/config/business";
import { getAnalytics } from "@/lib/analytics";
import { getBookings } from "@/lib/bookings";
import { getClients } from "@/lib/clients";
import { formatBusinessTime, getTodayDateString } from "@/lib/date";
import type { AutomationInsight } from "@/lib/automation/types";

const LOW_BOOKINGS_THRESHOLD = 3;

export async function runInsightsEngine(): Promise<AutomationInsight[]> {
  const [analytics, bookings, clients] = await Promise.all([
    getAnalytics(),
    getBookings(),
    getClients(),
  ]);

  const insights: AutomationInsight[] = [];
  const today = getTodayDateString();
  const todayBookings = bookings.filter(
    (booking) => booking.date === today && booking.status === "upcoming"
  );

  if (todayBookings.length < LOW_BOOKINGS_THRESHOLD) {
    insights.push({
      type: "low_bookings",
      message: "Low bookings today — send reactivation messages.",
      priority: "high",
    });
  }

  const bookedHours = new Set(todayBookings.map((booking) => Number(booking.time.slice(0, 2))));
  const gapHours: number[] = [];
  for (let hour = BUSINESS.operatingHours.start; hour < BUSINESS.operatingHours.end; hour += 1) {
    if (!bookedHours.has(hour)) {
      gapHours.push(hour);
    }
  }

  if (gapHours.length > 0) {
    insights.push({
      type: "gap_alert",
      message: `${formatBusinessTime(`${String(gapHours[0]).padStart(2, "0")}:00`)} has no bookings — push offers.`,
      priority: "high",
    });
  }

  if (analytics.busiestTimeSlots[0]) {
    insights.push({
      type: "peak_hours",
      message: `Peak hours: ${formatBusinessTime(analytics.busiestTimeSlots[0].slot)} — consider premium pricing.`,
      priority: "medium",
    });
  }

  if (analytics.mostPopularService) {
    insights.push({
      type: "top_service",
      message: `${analytics.mostPopularService} is your top service — feature it in promotions.`,
      priority: "low",
    });
  }

  if (clients.some((client) => client.reactivationEligible && client.isInactive)) {
    insights.push({
      type: "low_bookings",
      message: "Inactive clients are eligible for outreach — queue reactivation messages.",
      priority: "medium",
    });
  }

  return insights;
}
