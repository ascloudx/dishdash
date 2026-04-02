import { DEFAULT_SLOTS } from "@/config/slots";
import { redis } from "@/lib/redis";
import { compareTimeStrings, isTimeWithinHours, normalizeTimeInput } from "@/lib/time";

const SLOTS_KEY = "dira:slots";

interface SlotStore {
  default: string[];
  custom: string[];
}

function normalizeSlots(slots: string[]) {
  return Array.from(
    new Set(
      slots
        .map((slot) => normalizeTimeInput(slot))
        .filter((slot): slot is string => Boolean(slot))
    )
  ).sort(compareTimeStrings);
}

function createDefaultStore(): SlotStore {
  return {
    default: normalizeSlots([...DEFAULT_SLOTS]),
    custom: [],
  };
}

export async function getSlotStore(): Promise<SlotStore> {
  const stored = await redis.getJSON<SlotStore>(SLOTS_KEY);
  const fallback = createDefaultStore();

  return {
    default: normalizeSlots(stored?.default ?? fallback.default),
    custom: normalizeSlots(stored?.custom ?? []),
  };
}

export async function saveSlotStore(store: SlotStore) {
  await redis.setJSON(SLOTS_KEY, {
    default: normalizeSlots(store.default),
    custom: normalizeSlots(store.custom),
  });
}

export async function getMergedSlots() {
  const store = await getSlotStore();
  return normalizeSlots([...store.default, ...store.custom]);
}

export async function addCustomSlot(slot: string) {
  const normalized = normalizeTimeInput(slot);
  if (!normalized) {
    return await getSlotStore();
  }

  const current = await getSlotStore();
  if (current.default.includes(normalized) || current.custom.includes(normalized)) {
    return current;
  }

  const next = {
    default: current.default,
    custom: normalizeSlots([...current.custom, normalized]),
  };

  await saveSlotStore(next);
  return next;
}

export async function getVisibleSlots(startHour: number, endHour: number) {
  const slots = await getMergedSlots();
  return slots.filter((slot) => isTimeWithinHours(slot, startHour, endHour));
}
