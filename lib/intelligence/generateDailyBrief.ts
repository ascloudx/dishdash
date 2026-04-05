import type { GeneratedAction } from "@/lib/actions/generateActions";
import type { MissedOpportunity } from "@/lib/engagement/types";
import type { Booking } from "@/types/booking";
import type { PrioritizedClient } from "@/lib/intelligence/prioritizeClients";
import type { SlotMatch } from "@/lib/intelligence/matchClientsToSlots";

export interface DailyBrief {
  performance: string;
  gapVsTarget: string;
  biggestOpportunity: string;
  recommendedAction: string;
}

export function generateDailyBrief(params: {
  bookings: Booking[];
  dailyTarget: number;
  revenueToday: number;
  slotMatches: SlotMatch[];
  prioritizedClients: PrioritizedClient[];
  actions: GeneratedAction[];
  missedOpportunities?: MissedOpportunity[];
}) {
  const activeTodayBookings = params.bookings.filter(
    (booking) => booking.type !== "blocked" && booking.status !== "cancelled"
  ).length;
  const revenueGap = Math.max(params.dailyTarget - params.revenueToday, 0);
  const topSlot = params.slotMatches[0];
  const topClient = params.prioritizedClients[0];
  const biggestOpportunity = topSlot
    ? `${topSlot.slot} is still open and ${topSlot.candidates[0]?.name ?? "a strong-fit client"} is a high-fit match.`
    : topClient
      ? `${topClient.name} is the best recovery target right now.`
      : "No immediate gap or outreach opportunity is active right now.";

  const recommendedAction = params.actions[0]?.title ?? "Review live bookings and protect the strongest slot.";
  const missedContext = params.missedOpportunities?.[0]
    ? ` Yesterday: ${params.missedOpportunities[0].title}.`
    : "";

  return {
    performance: `${activeTodayBookings} active booking${activeTodayBookings === 1 ? "" : "s"} today with ${params.revenueToday.toLocaleString("en-CA")} booked so far.${missedContext}`,
    gapVsTarget:
      revenueGap > 0
        ? `${revenueGap.toLocaleString("en-CA")} remains to hit today's target.`
        : `You've cleared today's target by ${(params.revenueToday - params.dailyTarget).toLocaleString("en-CA")}.`,
    biggestOpportunity,
    recommendedAction,
  } satisfies DailyBrief;
}
