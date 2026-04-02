import type { Insight } from "@/lib/insights/generateInsights";

export function generateHeroMessage(name: string, bookingsToday: number, insights: Insight[]) {
  const firstName = name.trim() || "there";
  const hasLowBookings = insights.some((insight) => insight.type === "low_bookings");
  const hasGap = insights.some((insight) => insight.type === "dead_slot");
  const hasRevenueGap = insights.some((insight) => insight.type === "revenue_gap");

  if (bookingsToday === 0) {
    return `You have a clean slate today, ${firstName}. Let's turn open time into booked revenue.`;
  }

  if (hasLowBookings || hasGap || hasRevenueGap) {
    return `You're building momentum, ${firstName}. Let's fill the gaps today.`;
  }

  return `You're carrying strong momentum today, ${firstName}. Protect the flow and keep the standard high.`;
}
