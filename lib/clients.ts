import type { Client, ClientLifecycle } from "@/types/client";
import type { Booking } from "@/types/booking";
import { getBookings } from "./bookings";
import { updateBooking } from "./bookings";
import { getTodayDateString, isOlderThanDays } from "@/lib/date";
import { getClientAutomationStateMap, moveClientAutomationState } from "@/lib/automation/state";
import { getClientNotesMap, moveClientNote } from "@/lib/clientNotes";
import { extractPreferences } from "@/lib/clients/extractPreferences";
import { scoreClient } from "@/lib/clients/scoreClient";
import { prioritizeClients } from "@/lib/intelligence/prioritizeClients";
import { normalizePhone } from "@/lib/bookingValidation";

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

function getPreferredValue(values: string[]) {
  const counts = new Map<string, number>();

  for (const value of values.filter(Boolean)) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
}

function getWeekdayLabel(date: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Edmonton",
    weekday: "long",
  }).format(new Date(`${date}T12:00:00.000Z`));
}

function deriveHistorySignals(bookings: Booking[]) {
  const active = bookings.filter((booking) => booking.status !== "cancelled");
  const preferredTime = getPreferredValue(active.map((booking) => booking.time));
  const preferredService = getPreferredValue(
    active
      .filter((booking) => booking.type !== "blocked" && booking.price > 0)
      .map((booking) => booking.serviceName)
  );
  const preferredDayOfWeek = getPreferredValue(active.map((booking) => getWeekdayLabel(booking.date)));

  const preferenceLabels = [
    preferredTime ? `Usually books ${preferredTime}` : null,
    preferredDayOfWeek ? `Usually books on ${preferredDayOfWeek}s` : null,
    preferredService ? `Usually books ${preferredService}` : null,
  ].filter((value): value is string => Boolean(value));

  const autoSummary =
    preferenceLabels.length > 0
      ? preferenceLabels.join(" · ")
      : null;

  return {
    preferredTime,
    preferredService,
    preferredDayOfWeek,
    preferenceLabels,
    autoSummary,
  };
}

function getLatestName(bookings: Booking[]) {
  return [...bookings]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .find((booking) => booking.name.trim())?.name ?? "Client";
}

function normalizeClientNameKey(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getClientIdentityKey(name: string, phone: string, phoneNormalized?: string) {
  const normalized = phoneNormalized || normalizePhone(phone).normalized;
  return normalized || `name:${normalizeClientNameKey(name)}`;
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
    if (booking.type === "blocked") {
      continue;
    }

    const key =
      booking.phoneNormalized ||
      booking.phone ||
      `name:${normalizeClientNameKey(booking.name)}`;
    const existing = grouped.get(key) ?? [];
    existing.push(booking);
    grouped.set(key, existing);
  }

  const baseClients = Array.from(grouped.entries())
    .map(([phoneNormalized, clientBookings]) => {
      const activeBookings = clientBookings.filter((booking) => booking.status !== "cancelled");
      const history = [...clientBookings].sort((a, b) => b.datetime.localeCompare(a.datetime));
      const visitCount = activeBookings.length;
      const totalSpent = activeBookings.reduce((sum, booking) => sum + booking.price, 0);
      const lastVisit = history[0]?.date ?? "";
      const identityKey =
        phoneNormalized.startsWith("name:")
          ? phoneNormalized
          : phoneNormalized || `name:${normalizeClientNameKey(getLatestName(history))}`;
      const automationState = clientStateMap[identityKey] ?? null;
      const clientNote = clientNotesMap[identityKey];
      const tagSet = new Set<string>();
      const notesHistory = history.map((booking) => booking.notes).filter(Boolean);
      if (clientNote?.note) {
        notesHistory.unshift(clientNote.note);
      }
      const extracted = extractPreferences(notesHistory);
      const historySignals = deriveHistorySignals(history);

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
        id: identityKey,
        name: getLatestName(history),
        phone: history[0]?.phone ?? "",
        phoneNormalized: phoneNormalized.startsWith("name:") ? "" : phoneNormalized,
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
        preferences: Array.from(
          new Set([
            ...derivePreferences(Array.from(tagSet)),
            ...historySignals.preferenceLabels,
            ...extracted.preferences,
          ])
        ),
        preferredTime: extracted.preferredTime ?? historySignals.preferredTime,
        preferredDayOfWeek: historySignals.preferredDayOfWeek,
        preferredService: extracted.preferredService ?? historySignals.preferredService,
        autoSummary: historySignals.autoSummary,
        isInactive: lifecycle === "At Risk" || lifecycle === "Lost",
        lastContactedAt: automationState?.lastContactedAt ?? null,
        reactivationEligible:
          (lifecycle === "At Risk" || lifecycle === "Lost") &&
          isTimestampOlderThanDays(automationState?.lastContactedAt, 7),
      };
    })
    .filter((client) => Boolean(client.lastVisit));

  const prioritized = prioritizeClients({
    clients: baseClients,
    bookings,
    today,
  });
  const priorityMap = new Map(
    prioritized.map((entry) => [
      entry.clientId,
      {
        priorityScore: entry.priorityScore,
        priorityReason: entry.reason,
        nextActionHint: entry.nextActionHint,
      },
    ])
  );

  return baseClients
    .map((client) => ({
      ...client,
      priorityScore: priorityMap.get(client.id)?.priorityScore ?? client.score,
      priorityReason: priorityMap.get(client.id)?.priorityReason,
      nextActionHint: priorityMap.get(client.id)?.nextActionHint,
    }))
    .sort((a, b) => (b.priorityScore ?? b.score) - (a.priorityScore ?? a.score));
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
          `name:${normalizeClientNameKey(booking.name)}` === phone ||
          booking.id === phone ||
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
  const fallbackId = `name:${normalizeClientNameKey(profileBookings[0].name)}`;
  const client =
    clients.find((entry) => entry.phoneNormalized === phoneNormalized) ??
    clients.find((entry) => entry.id === fallbackId || entry.id === phone) ??
    null;

  return client ? { client, bookings: profileBookings } : null;
}

export async function updateClientProfile(
  clientId: string,
  updates: {
    name?: string;
    phone?: string;
  }
) {
  const profile = await getClientProfile(clientId);

  if (!profile) {
    return null;
  }

  const nextName = updates.name?.trim() || profile.client.name;
  const nextPhone = updates.phone?.trim() || profile.client.phone;
  const nextPhoneInfo = normalizePhone(nextPhone);
  const nextClientId = getClientIdentityKey(nextName, nextPhone, nextPhoneInfo.normalized);

  for (const booking of profile.bookings) {
    await updateBooking(booking.id, {
      name: nextName,
      phone: nextPhone,
    });
  }

  if (profile.client.id !== nextClientId) {
    await Promise.all([
      moveClientNote(profile.client.id, nextClientId),
      moveClientAutomationState(profile.client.id, nextClientId),
    ]);
  }

  return getClientProfile(nextClientId);
}
