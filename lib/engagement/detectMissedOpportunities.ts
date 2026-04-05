import { getServiceByInput } from "@/config/services";
import type { Booking } from "@/types/booking";
import type { PrioritizedClient } from "@/lib/intelligence/prioritizeClients";
import type { SlotMatch } from "@/lib/intelligence/matchClientsToSlots";
import type { MissedOpportunity } from "@/lib/engagement/types";

function averageBookingValue(bookings: Booking[]) {
  const active = bookings.filter((booking) => booking.type !== "blocked" && booking.status !== "cancelled" && booking.price > 0);
  if (active.length === 0) {
    return 0;
  }

  return Math.round(active.reduce((total, booking) => total + booking.price, 0) / active.length);
}

function getClientEstimatedValue(client: PrioritizedClient, fallbackValue: number) {
  if (client.client.preferredService) {
    const service = getServiceByInput(client.client.preferredService);
    if (service) {
      return service.price;
    }
  }

  if (client.client.totalVisits > 0) {
    return Math.max(fallbackValue, Math.round(client.client.totalSpent / client.client.totalVisits));
  }

  return fallbackValue;
}

export function detectMissedOpportunities(params: {
  bookings: Booking[];
  slotMatches: SlotMatch[];
  prioritizedClients: PrioritizedClient[];
  executedActionIds: string[];
}) {
  const fallbackValue = averageBookingValue(params.bookings);
  const opportunities: MissedOpportunity[] = [];

  for (const slotMatch of params.slotMatches.slice(0, 3)) {
    const matchingActionIdPrefix = `action:slot:${slotMatch.slot}:`;
    const slotHandled = params.executedActionIds.some((actionId) => actionId.startsWith(matchingActionIdPrefix));
    if (slotHandled) {
      continue;
    }

    opportunities.push({
      id: `missed-slot:${slotMatch.slot}`,
      title: `Open slot still available at ${slotMatch.slot}`,
      reason: slotMatch.candidates[0]
        ? `${slotMatch.candidates[0].name} was the best-fit outreach for this opening.`
        : "This slot stayed open without a matched outreach move.",
      estimatedValue: (() => {
        if (!slotMatch.candidates[0]) {
          return fallbackValue;
        }

        const matchedClient = params.prioritizedClients.find(
          (entry) => entry.clientId === slotMatch.candidates[0].clientId
        );
        return matchedClient
          ? getClientEstimatedValue(matchedClient, fallbackValue)
          : fallbackValue;
      })(),
    });
  }

  for (const client of params.prioritizedClients.filter((entry) => entry.client.isInactive).slice(0, 3)) {
    const clientHandled = params.executedActionIds.some((actionId) => actionId.includes(client.clientId));
    if (clientHandled) {
      continue;
    }

    opportunities.push({
      id: `missed-client:${client.clientId}`,
      title: `${client.name} was not contacted`,
      reason: client.reason,
      estimatedValue: getClientEstimatedValue(client, fallbackValue),
    });
  }

  return opportunities.sort((left, right) => right.estimatedValue - left.estimatedValue);
}
