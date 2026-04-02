import type { Client, ClientLifecycle } from "@/types/client";
import type { Booking } from "@/types/booking";
import { getBookings } from "./bookings";
import { getTodayDateString, isOlderThanDays } from "@/lib/date";
import { getClientAutomationStateMap } from "@/lib/automation/state";
import { getClientNotesMap } from "@/lib/clientNotes";
import { extractPreferences } from "@/lib/clients/extractPreferences";
import { scoreClient } from "@/lib/clients/scoreClient";

function assignLifecycle(visits: number, lastVisit: string, today: string): ClientLifecycle {
  if (isOlderThanDays(lastVisit, today, 60)) return "Lost";
  if (isOlderThanDays(lastVisit, today, 35)) return "At Risk";
  if (visits >= 4) return "Loyal";
  if (visits >= 2) return "Active";
  return "New";
}

function isTimestampOlderThanDays(timestamp: string | null | undefined, days: number) {
  if (!timestamp) {
    return true;
  }

  return Date.now() - new Date(timestamp).getTime() > days * 24 * 60 * 60 * 1000;
}

function derivePreferences(tags: string[]) {
  return tags.map((tag) => {
    if (tag === "time:evening") return "Evening appointments";
    if (tag === "style:nude") return "Nude styles";
    if (tag === "style:chrome") return "Chrome finishes";
    if (tag === "occasion:birthday") return "Birthday bookings";
    if (tag === "occasion:wedding") return "Wedding bookings";
    return tag;
  });
}

function getLatestName(bookings: Booking[]) {
  return [...bookings]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .find((booking) => booking.name.trim())?.name ?? "Client";
}

export async function getClients(): Promise<Client[]> {
  const bookings = await getBookings();
  const today = getTodayDateString();
  const [clientStateMap, clientNotesMap] = await Promise.all([
    getClientAutomationStateMap(),
    getClientNotesMap(),
  ]);
  const grouped = new Map<string, Booking[]>();

  for (const booking of bookings) {
    if (booking.type === "blocked" || !booking.phoneNormalized) {
      continue;
    }

    const key = booking.phoneNormalized || booking.phone;
    const existing = grouped.get(key) ?? [];
    existing.push(booking);
    grouped.set(key, existing);
  }

  return Array.from(grouped.entries())
    .map(([phoneNormalized, clientBookings]) => {
      const activeBookings = clientBookings.filter((booking) => booking.status !== "cancelled");
      const history = [...clientBookings].sort((a, b) => b.datetime.localeCompare(a.datetime));
      const visitCount = activeBookings.length;
      const totalSpent = activeBookings.reduce((sum, booking) => sum + booking.price, 0);
      const lastVisit = history[0]?.date ?? "";
      const automationState = clientStateMap[phoneNormalized] ?? null;
      const clientNote = clientNotesMap[phoneNormalized];
      const tagSet = new Set<string>();
      const notesHistory = history.map((booking) => booking.notes).filter(Boolean);
      if (clientNote?.note) {
        notesHistory.unshift(clientNote.note);
      }
      const extracted = extractPreferences(notesHistory);

      for (const booking of history) {
        for (const tagValue of booking.tags) {
          tagSet.add(tagValue);
        }
      }
      for (const tagValue of clientNote?.tags ?? []) {
        tagSet.add(tagValue);
      }
      for (const tagValue of extracted.tags) {
        tagSet.add(tagValue);
      }
      const scored = scoreClient({
        totalVisits: visitCount,
        totalSpent,
        lastVisit,
        today,
      });
      const lifecycle = assignLifecycle(visitCount, lastVisit, today);
      const derivedTag: Client["tag"] =
        scored.tag === "At Risk" ? "At Risk" : scored.tag;

      return {
        id: phoneNormalized || history[0]?.id || crypto.randomUUID(),
        name: getLatestName(history),
        phone: history[0]?.phone ?? "",
        phoneNormalized,
        phoneValid: history.some((booking) => booking.phoneValid),
        totalVisits: visitCount,
        totalSpent,
        lastVisit,
        tags: Array.from(tagSet),
        note: clientNote?.note ?? "",
        notesHistory,
        createdAt: [...history].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0]?.createdAt ?? new Date().toISOString(),
        tag: derivedTag,
        lifecycle,
        score: scored.score,
        preferences: Array.from(new Set([...derivePreferences(Array.from(tagSet)), ...extracted.preferences])),
        preferredTime: extracted.preferredTime,
        preferredService: extracted.preferredService,
        isInactive: lifecycle === "At Risk" || lifecycle === "Lost",
        lastContactedAt: automationState?.lastContactedAt ?? null,
        reactivationEligible:
          (lifecycle === "At Risk" || lifecycle === "Lost") &&
          isTimestampOlderThanDays(automationState?.lastContactedAt, 7),
      };
    })
    .filter((client) => Boolean(client.lastVisit))
    .sort((a, b) => b.score - a.score);
}

export async function searchClients(query: string) {
  const clients = await getClients();
  const normalizedQuery = query.toLowerCase();

  return clients.filter(
    (client) =>
      client.name.toLowerCase().includes(normalizedQuery) ||
      client.phone.includes(query) ||
      client.phoneNormalized.includes(query)
  );
}

export async function getClientProfile(phone: string) {
  const bookings = await getBookings();
  const profileBookings = bookings
    .filter(
      (booking) =>
        booking.type !== "blocked" &&
        (
          booking.phone === phone ||
          booking.phoneNormalized === phone ||
          encodeURIComponent(booking.phoneNormalized) === phone
        )
    )
    .sort((a, b) => b.datetime.localeCompare(a.datetime));

  if (profileBookings.length === 0) {
    return null;
  }

  const clients = await getClients();
  const phoneNormalized = profileBookings[0].phoneNormalized;
  const client = clients.find((entry) => entry.phoneNormalized === phoneNormalized) ?? null;

  return client ? { client, bookings: profileBookings } : null;
}
