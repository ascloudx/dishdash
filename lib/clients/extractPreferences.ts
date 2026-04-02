import { getServiceById, matchServiceId } from "@/config/services";
import { normalizeTimeInput } from "@/lib/time";

export interface ExtractedPreferences {
  preferredTime: string | null;
  preferredService: string | null;
  tags: string[];
  preferences: string[];
}

function normalizeNotes(input: string | string[]) {
  return (Array.isArray(input) ? input : [input])
    .map((value) => value.trim())
    .filter(Boolean);
}

function findPreferredTime(notes: string[]) {
  for (const note of notes) {
    const explicitTime = note.match(/\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s?(am|pm)\b/i);
    if (explicitTime) {
      const normalized = normalizeTimeInput(
        `${explicitTime[1]}:${explicitTime[2] ?? "00"} ${explicitTime[3].toUpperCase()}`
      );
      if (normalized) {
        return normalized;
      }
    }

    const lower = note.toLowerCase();
    if (lower.includes("evening")) {
      return "Evening";
    }
    if (lower.includes("afternoon")) {
      return "Afternoon";
    }
    if (lower.includes("morning")) {
      return "Morning";
    }
  }

  return null;
}

function findPreferredService(notes: string[]) {
  for (const note of notes) {
    const serviceId = matchServiceId(note);
    if (serviceId) {
      return getServiceById(serviceId)?.name ?? null;
    }

    const lower = note.toLowerCase();
    if (lower.includes("bridal")) {
      return getServiceById("bridal")?.name ?? "Bridal Set";
    }
  }

  return null;
}

export function extractPreferences(input: string | string[]): ExtractedPreferences {
  const notes = normalizeNotes(input);
  const preferredTime = findPreferredTime(notes);
  const preferredService = findPreferredService(notes);
  const tags = new Set<string>();
  const preferences = new Set<string>();

  for (const note of notes) {
    const lower = note.toLowerCase();

    if (lower.includes("budget")) {
      tags.add("budget");
      preferences.add("Budget-conscious");
    }
    if (lower.includes("birthday")) {
      tags.add("occasion:birthday");
      preferences.add("Birthday bookings");
    }
    if (lower.includes("wedding")) {
      tags.add("occasion:wedding");
      preferences.add("Wedding bookings");
    }
    if (lower.includes("event")) {
      tags.add("occasion:event");
      preferences.add("Event-ready sets");
    }
  }

  if (preferredTime) {
    tags.add(`preferred_time:${preferredTime.toLowerCase()}`);
    preferences.add(
      preferredTime.includes(":") ? `Prefers ${preferredTime}` : `${preferredTime} appointments`
    );
  }

  if (preferredService) {
    tags.add(`preferred_service:${preferredService.toLowerCase()}`);
    preferences.add(`Prefers ${preferredService}`);
  }

  return {
    preferredTime,
    preferredService,
    tags: Array.from(tags),
    preferences: Array.from(preferences),
  };
}
