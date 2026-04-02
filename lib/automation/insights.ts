import { getAnalytics } from "@/lib/analytics";
import { getBookings } from "@/lib/bookings";
import { formatBusinessTime, getTodayDateString } from "@/lib/date";
import { getSettings } from "@/lib/settings";
import { getVisibleSlots } from "@/lib/slots";
import type { AutomationInsight } from "@/lib/automation/types";
import { compareTimeStrings, timeToMinutes } from "@/lib/time";

function buildGapRanges(slots: string[], slotDuration: number) {
  if (slots.length === 0) {
    return [];
  }

  const ranges: Array<{ start: string; end: string }> = [];
  let rangeStart = slots[0];
  let previous = slots[0];

  for (let index = 1; index < slots.length; index += 1) {
    const slot = slots[index];
    if ((timeToMinutes(slot) ?? 0) !== (timeToMinutes(previous) ?? 0) + slotDuration) {
      ranges.push({ start: rangeStart, end: previous });
      rangeStart = slot;
    }
    previous = slot;
  }

  ranges.push({ start: rangeStart, end: previous });
  return ranges;
}

export async function runInsightsEngine(): Promise<AutomationInsight[]> {
  const [analytics, bookings, settings] = await Promise.all([
    getAnalytics(),
    getBookings(),
    getSettings(),
  ]);

  const today = getTodayDateString();
  const todayBookings = bookings.filter(
    (booking) =>
      booking.type !== "blocked" &&
      booking.date === today &&
      booking.status !== "cancelled"
  );
  const insights: AutomationInsight[] = [];

  if (todayBookings.length <= 1) {
    insights.push({
      type: "low_bookings",
      message: "You have low bookings today — consider reaching out to clients.",
      priority: "high",
    });
  }

  const availableSlots = (await getVisibleSlots(
    settings.businessHours.start,
    settings.businessHours.end
  )).sort(compareTimeStrings);
  const bookedSlots = new Set(todayBookings.map((booking) => booking.time));
  const freeSlots = availableSlots.filter((slot) => !bookedSlots.has(slot));
  const gaps = buildGapRanges(freeSlots, settings.slotDuration);
  if (gaps[0]) {
    insights.push({
      type: "gap_alert",
      message:
        gaps[0].start === gaps[0].end
          ? `You have a free slot at ${formatBusinessTime(gaps[0].start)}.`
          : `You have free time between ${formatBusinessTime(gaps[0].start)} - ${formatBusinessTime(gaps[0].end)}.`,
      priority: "high",
    });
  }

  if (todayBookings.length === 1) {
    insights.push({
      type: "peak_hours",
      message: `Your current bookings are around ${formatBusinessTime(todayBookings[0].time)}.`,
      priority: "medium",
    });
  } else if (analytics.busiestTimeSlots[0]) {
    insights.push({
      type: "peak_hours",
      message: `Peak hours are around ${formatBusinessTime(analytics.busiestTimeSlots[0].slot)}.`,
      priority: "medium",
    });
  }

  if (analytics.mostPopularService) {
    insights.push({
      type: "top_service",
      message: `${analytics.mostPopularService} is currently your top service.`,
      priority: "low",
    });
  }

  return insights.sort((left, right) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[left.priority] - priorityOrder[right.priority];
  });
}
