import type { GeneratedAction } from "@/lib/actions/generateActions";
import type { SlotMatch } from "@/lib/intelligence/matchClientsToSlots";
import type { PrioritizedClient } from "@/lib/intelligence/prioritizeClients";

export interface DailyFlow {
  morningPlan: string;
  middayAdjustment: string;
  endOfDayReflection: string;
}

export function generateDailyFlow(params: {
  currentHour: number;
  bookingsToday: number;
  revenueGap: number;
  slotMatches: SlotMatch[];
  prioritizedClients: PrioritizedClient[];
  actions: GeneratedAction[];
}) {
  const firstSlot = params.slotMatches[0];
  const firstClient = params.prioritizedClients[0];
  const firstAction = params.actions[0];
  const phaseLabel =
    params.currentHour < 12 ? "This morning" : params.currentHour < 17 ? "This afternoon" : "Before close";

  return {
    morningPlan: firstAction
      ? `${phaseLabel}, start with ${firstAction.title.toLowerCase()}.`
      : `Start by reviewing today's bookings and open capacity.`,
    middayAdjustment: firstSlot
      ? `If ${firstSlot.slot} is still open by midday, move on ${firstSlot.candidates[0]?.name ?? "your top match"} next.`
      : params.revenueGap > 0
        ? `By midday, review the ${params.revenueGap.toLocaleString("en-CA")} revenue gap and push one same-day offer.`
        : `By midday, protect the booked flow and avoid unnecessary discounts.`,
    endOfDayReflection: firstClient
      ? `Before closing, note whether outreach to ${firstClient.name} created movement for tomorrow.`
      : `Before closing, review which actions were executed and which opportunities stayed open.`,
  } satisfies DailyFlow;
}
