import type { ImportedBooking, ImportedClient, ImportInsight } from "@/lib/imports/types";

interface GenerateInsightsParams {
  bookings: ImportedBooking[];
  clients: ImportedClient[];
  currentDate?: string;
}

function getTopEntry(record: Record<string, number>) {
  return Object.entries(record).sort((left, right) => right[1] - left[1])[0] ?? null;
}

function toDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function hoursFromTime(time: string) {
  const [hourText] = time.split(":");
  return Number(hourText);
}

export function generateInsights({
  bookings,
  clients,
  currentDate = new Date().toISOString().slice(0, 10),
}: GenerateInsightsParams): ImportInsight[] {
  const insights: ImportInsight[] = [];
  const middayBookings = bookings.filter((booking) => {
    const hour = hoursFromTime(booking.time);
    return hour >= 11 && hour < 14;
  });

  if (middayBookings.length <= Math.max(1, Math.floor(bookings.length * 0.12))) {
    insights.push({
      type: "gap",
      priority: "high",
      message: `You have low bookings between 11 AM and 2 PM with only ${middayBookings.length} booking${middayBookings.length === 1 ? "" : "s"} logged there.`,
      action: "Promote this slot",
    });
  }

  const timeFrequency = bookings.reduce<Record<string, number>>((accumulator, booking) => {
    accumulator[booking.time] = (accumulator[booking.time] ?? 0) + 1;
    return accumulator;
  }, {});
  const topTime = getTopEntry(timeFrequency);
  if (topTime) {
    insights.push({
      type: "pricing",
      priority: topTime[1] >= 3 ? "high" : "medium",
      message: `${topTime[0]} is your most booked time with ${topTime[1]} booking${topTime[1] === 1 ? "" : "s"}.`,
      action: "Increase price",
    });
  }

  const serviceFrequency = bookings.reduce<Record<string, number>>((accumulator, booking) => {
    accumulator[booking.service] = (accumulator[booking.service] ?? 0) + 1;
    return accumulator;
  }, {});
  const topService = getTopEntry(serviceFrequency);
  if (topService) {
    insights.push({
      type: "service",
      priority: topService[1] >= 4 ? "high" : "medium",
      message: `${topService[0]} is your top service with ${topService[1]} booking${topService[1] === 1 ? "" : "s"}.`,
      action: "Feature it today",
    });
  }

  const inactiveClientCount = clients.filter((client) => {
    const diff = toDate(currentDate).getTime() - toDate(client.last_visit).getTime();
    return diff > 30 * 24 * 60 * 60 * 1000;
  }).length;

  if (inactiveClientCount > 0) {
    insights.push({
      type: "client",
      priority: inactiveClientCount >= 5 ? "high" : "medium",
      message: `${inactiveClientCount} client${inactiveClientCount === 1 ? "" : "s"} haven’t returned in 30+ days.`,
      action: "Send reactivation messages",
    });
  }

  return insights;
}
