import { redis } from "@/lib/redis";

export interface AppSettings {
  businessHours: {
    start: number;
    end: number;
  };
  slotDuration: number;
  currency: "CAD";
  dailyTarget: number;
  weeklyTarget: number;
  monthlyTarget: number;
  yearlyTarget: number;
}

const SETTINGS_KEY = "settings:default";

const DEFAULT_SETTINGS: AppSettings = {
  businessHours: {
    start: 9,
    end: 20,
  },
  slotDuration: 60,
  currency: "CAD",
  dailyTarget: 250,
  weeklyTarget: 1500,
  monthlyTarget: 6000,
  yearlyTarget: 72000,
};

function sanitizeSettings(input: Partial<AppSettings> | null | undefined): AppSettings {
  const start = input?.businessHours?.start;
  const end = input?.businessHours?.end;
  const slotDuration = input?.slotDuration;
  const dailyTarget = input?.dailyTarget;
  const weeklyTarget = input?.weeklyTarget;
  const monthlyTarget = input?.monthlyTarget;
  const yearlyTarget = input?.yearlyTarget;

  return {
    businessHours: {
      start:
        typeof start === "number" && start >= 0 && start <= 23
          ? start
          : DEFAULT_SETTINGS.businessHours.start,
      end:
        typeof end === "number" && end > (start ?? DEFAULT_SETTINGS.businessHours.start) && end <= 24
          ? end
          : DEFAULT_SETTINGS.businessHours.end,
    },
    slotDuration:
      typeof slotDuration === "number" && slotDuration > 0 && slotDuration <= 240
        ? slotDuration
        : DEFAULT_SETTINGS.slotDuration,
    currency: "CAD",
    dailyTarget:
      typeof dailyTarget === "number" && dailyTarget >= 0
        ? dailyTarget
        : DEFAULT_SETTINGS.dailyTarget,
    weeklyTarget:
      typeof weeklyTarget === "number" && weeklyTarget >= 0
        ? weeklyTarget
        : DEFAULT_SETTINGS.weeklyTarget,
    monthlyTarget:
      typeof monthlyTarget === "number" && monthlyTarget >= 0
        ? monthlyTarget
        : DEFAULT_SETTINGS.monthlyTarget,
    yearlyTarget:
      typeof yearlyTarget === "number" && yearlyTarget >= 0
        ? yearlyTarget
        : DEFAULT_SETTINGS.yearlyTarget,
  };
}

export async function getSettings() {
  const stored = await redis.getJSON<AppSettings>(SETTINGS_KEY);
  return sanitizeSettings(stored);
}

export async function updateSettings(updates: Partial<AppSettings>) {
  const current = await getSettings();
  const next = sanitizeSettings({
    ...current,
    ...updates,
    businessHours: {
      ...current.businessHours,
      ...(updates.businessHours ?? {}),
    },
  });

  await redis.setJSON(SETTINGS_KEY, next);
  return next;
}
