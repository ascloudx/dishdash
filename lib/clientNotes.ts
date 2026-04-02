import { redis } from "@/lib/redis";
import { extractBookingTags } from "@/lib/bookingValidation";

const CLIENT_NOTES_KEY = "dira:client-notes";

export interface ClientNoteRecord {
  note: string;
  tags: string[];
  updatedAt: string;
}

type ClientNotesMap = Record<string, ClientNoteRecord>;

function normalizeClientNote(note: string) {
  const value = note.trim();
  const tags = new Set(extractBookingTags(value));

  if (value.toLowerCase().includes("budget")) {
    tags.add("budget");
  }
  if (value.toLowerCase().includes("event")) {
    tags.add("event type");
  }
  if (value.toLowerCase().includes("evening")) {
    tags.add("evening preferred");
  }

  return {
    note: value,
    tags: Array.from(tags),
    updatedAt: new Date().toISOString(),
  };
}

export async function getClientNotesMap() {
  return (await redis.getJSON<ClientNotesMap>(CLIENT_NOTES_KEY)) ?? {};
}

export async function updateClientNote(clientId: string, note: string) {
  const current = await getClientNotesMap();
  current[clientId] = normalizeClientNote(note);
  await redis.setJSON(CLIENT_NOTES_KEY, current);
  return current[clientId];
}
