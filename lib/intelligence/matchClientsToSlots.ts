import type { Booking } from "@/types/booking";
import type { Client } from "@/types/client";
import { getTodayDateString } from "@/lib/date";
import { timeToMinutes } from "@/lib/time";
import type { PrioritizedClient } from "@/lib/intelligence/prioritizeClients";

export interface SlotClientCandidate {
  clientId: string;
  name: string;
  fitScore: number;
  reason: string;
  preferredService: string | null;
  preferredTime: string | null;
}

export interface SlotMatch {
  slot: string;
  priorityScore: number;
  candidates: SlotClientCandidate[];
}

function matchesTimePreference(client: Client, slot: string) {
  if (!client.preferredTime) {
    return false;
  }

  const normalizedPreference = client.preferredTime.toLowerCase();
  if (normalizedPreference.includes(":")) {
    return normalizedPreference === slot.toLowerCase();
  }

  const minutes = timeToMinutes(slot) ?? 0;
  if (normalizedPreference === "morning") {
    return minutes < 12 * 60;
  }
  if (normalizedPreference === "afternoon") {
    return minutes >= 12 * 60 && minutes < 17 * 60;
  }
  if (normalizedPreference === "evening") {
    return minutes >= 17 * 60;
  }

  return false;
}

function recentlyContacted(client: Client) {
  if (!client.lastContactedAt) {
    return false;
  }

  return Date.now() - new Date(client.lastContactedAt).getTime() < 7 * 24 * 60 * 60 * 1000;
}

function alreadyBookedToday(client: Client, bookings: Booking[], today: string) {
  return bookings.some(
    (booking) =>
      booking.type !== "blocked" &&
      booking.status !== "cancelled" &&
      booking.date === today &&
      booking.phoneNormalized === client.phoneNormalized
  );
}

export function matchClientsToSlots(params: {
  gaps: Array<{ slot: string; priorityScore: number }>;
  prioritizedClients: PrioritizedClient[];
  bookings: Booking[];
  topServiceName?: string | null;
  today?: string;
}) {
  const today = params.today ?? getTodayDateString();

  return params.gaps.map((gap) => {
    const candidates = params.prioritizedClients
      .filter((entry) => !recentlyContacted(entry.client) && !alreadyBookedToday(entry.client, params.bookings, today))
      .map((entry) => {
        const timeBoost = matchesTimePreference(entry.client, gap.slot) ? 18 : 0;
        const serviceBoost =
          params.topServiceName && entry.client.preferredService === params.topServiceName ? 12 : 0;
        const fitScore = entry.priorityScore + gap.priorityScore + timeBoost + serviceBoost;
        const reasonParts = [entry.reason];

        if (matchesTimePreference(entry.client, gap.slot)) {
          reasonParts.push(`Prefers ${entry.client.preferredTime?.toLowerCase()} slots.`);
        }
        if (params.topServiceName && entry.client.preferredService === params.topServiceName) {
          reasonParts.push(`Often aligns with ${params.topServiceName}.`);
        }

        return {
          clientId: entry.clientId,
          name: entry.name,
          fitScore,
          reason: reasonParts.join(" "),
          preferredService: entry.client.preferredService ?? null,
          preferredTime: entry.client.preferredTime ?? null,
        } satisfies SlotClientCandidate;
      })
      .sort((left, right) => right.fitScore - left.fitScore)
      .slice(0, 3);

    return {
      slot: gap.slot,
      priorityScore: gap.priorityScore,
      candidates,
    } satisfies SlotMatch;
  });
}
