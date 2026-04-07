import { redis } from "@/lib/redis";
import type { MissedOpportunity } from "@/lib/engagement/types";

const ACTION_EVENTS_KEY = "dira:action-events";
const DAILY_ACTIONS_INDEX_KEY = "daily:actions:index";

export type ActionEventType = "shown" | "executed" | "ignored";

export interface ActionEvent {
  actionId: string;
  eventType: ActionEventType;
  timestamp: string;
  dataReference?: string;
  slot?: string | null;
  clientIds?: string[];
  bookingIds?: string[];
}

interface DailyMemoryEntry {
  date: string;
  briefSummary?: string;
  shownActions: Record<
    string,
    {
      actionId: string;
      dataReference?: string;
      slot?: string | null;
      clientIds: string[];
      bookingIds: string[];
      shownCount: number;
      lastShownAt: string;
      executedAt?: string;
    }
  >;
  actionIds: string[];
  shownCounts: Record<string, number>;
  executedActionIds: string[];
  ignoredActionIds: string[];
  missedOpportunities: MissedOpportunity[];
  updatedAt: string;
}

export interface BehaviorSummary {
  shownCount: number;
  executedCount: number;
  ignoredCount: number;
  completedActionIds: string[];
  completedClientIds: string[];
  missedOpportunities: MissedOpportunity[];
  reinforcement: string[];
}

function dedupeEvent(existing: ActionEvent[], incoming: ActionEvent) {
  if (incoming.eventType !== "shown") {
    return false;
  }

  return existing.some((event) => {
    if (event.actionId !== incoming.actionId || event.eventType !== incoming.eventType) {
      return false;
    }

    return Math.abs(new Date(incoming.timestamp).getTime() - new Date(event.timestamp).getTime()) < 10 * 60 * 1000;
  });
}

async function getEvents() {
  return (await redis.getJSON<ActionEvent[]>(ACTION_EVENTS_KEY)) ?? [];
}

async function saveEvents(events: ActionEvent[]) {
  await redis.setJSON(ACTION_EVENTS_KEY, events.slice(-1000));
}

function dailyActionsKey(date: string) {
  return `daily:actions:${date}`;
}

async function getTrackedDates() {
  return (await redis.getJSON<string[]>(DAILY_ACTIONS_INDEX_KEY)) ?? [];
}

async function saveTrackedDates(dates: string[]) {
  await redis.setJSON(DAILY_ACTIONS_INDEX_KEY, Array.from(new Set(dates)).sort());
}

export async function getDailyActionState(date: string) {
  return await redis.getJSON<DailyMemoryEntry>(dailyActionsKey(date));
}

async function saveDailyActionState(date: string, state: DailyMemoryEntry) {
  await redis.setJSON(dailyActionsKey(date), state);
}

export async function getAllDailyActionStates() {
  const dates = await getTrackedDates();
  const states = await Promise.all(dates.map((date) => getDailyActionState(date)));
  return states.filter((state): state is DailyMemoryEntry => Boolean(state));
}

export async function trackBehavior(params: {
  date: string;
  events: ActionEvent[];
  briefSummary?: string;
  missedOpportunities?: MissedOpportunity[];
}) {
  const [existingEvents, trackedDates, existingState] = await Promise.all([
    getEvents(),
    getTrackedDates(),
    getDailyActionState(params.date),
  ]);
  const nextEvents = [...existingEvents];

  for (const event of params.events) {
    if (!dedupeEvent(existingEvents, event)) {
      nextEvents.push(event);
    }
  }

  const entry = existingState ?? {
    date: params.date,
    shownActions: {},
    actionIds: [],
    shownCounts: {},
    executedActionIds: [],
    ignoredActionIds: [],
    missedOpportunities: [],
    updatedAt: new Date().toISOString(),
  };

  if (params.briefSummary) {
    entry.briefSummary = params.briefSummary;
  }
  if (params.missedOpportunities) {
    entry.missedOpportunities = params.missedOpportunities;
  }

  for (const event of params.events) {
    if (!entry.actionIds.includes(event.actionId)) {
      entry.actionIds.push(event.actionId);
    }

    if (event.eventType === "shown") {
      entry.shownCounts[event.actionId] = (entry.shownCounts[event.actionId] ?? 0) + 1;
      entry.shownActions[event.actionId] = {
        actionId: event.actionId,
        dataReference: event.dataReference,
        slot: event.slot,
        clientIds: event.clientIds ?? [],
        bookingIds: event.bookingIds ?? [],
        shownCount: entry.shownCounts[event.actionId],
        lastShownAt: event.timestamp,
        executedAt: entry.shownActions[event.actionId]?.executedAt,
      };
    }

    if (event.eventType === "executed" && !entry.executedActionIds.includes(event.actionId)) {
      entry.executedActionIds.push(event.actionId);
      if (entry.shownActions[event.actionId]) {
        entry.shownActions[event.actionId].executedAt = event.timestamp;
      }
    }
  }

  entry.ignoredActionIds = Object.entries(entry.shownCounts)
    .filter(([actionId, count]) => count >= 2 && !entry.executedActionIds.includes(actionId))
    .map(([actionId]) => actionId);
  entry.updatedAt = new Date().toISOString();

  await Promise.all([
    saveEvents(nextEvents),
    saveDailyActionState(params.date, entry),
    saveTrackedDates([...trackedDates, params.date]),
  ]);
  return entry;
}

export async function getBehaviorSummary(date: string) {
  const entry = await getDailyActionState(date);

  if (!entry) {
    return {
      shownCount: 0,
      executedCount: 0,
      ignoredCount: 0,
      completedActionIds: [],
      completedClientIds: [],
      missedOpportunities: [],
      reinforcement: [],
    } satisfies BehaviorSummary;
  }

  const completedClientIds = Array.from(
    new Set(
      entry.executedActionIds.flatMap((actionId) => entry.shownActions[actionId]?.clientIds ?? [])
    )
  );

  const reinforcement = [
    entry.executedActionIds.length > 0
      ? `You acted on ${entry.executedActionIds.length} recommendation${entry.executedActionIds.length === 1 ? "" : "s"} today.`
      : "No execution tracked yet today.",
    entry.ignoredActionIds.length > 0
      ? `${entry.ignoredActionIds.length} recommendation${entry.ignoredActionIds.length === 1 ? "" : "s"} still need follow-through.`
      : "No ignored actions building up right now.",
  ];

  return {
    shownCount: entry.actionIds.length,
    executedCount: entry.executedActionIds.length,
    ignoredCount: entry.ignoredActionIds.length,
    completedActionIds: entry.executedActionIds,
    completedClientIds,
    missedOpportunities: entry.missedOpportunities,
    reinforcement,
  } satisfies BehaviorSummary;
}

export async function getPreviousDayMissedOpportunities(date: string) {
  const entries = await getAllDailyActionStates();
  const previousDates = entries.map((entry) => entry.date).filter((entryDate) => entryDate < date).sort();
  const lastDate = previousDates.at(-1);
  if (!lastDate) {
    return [];
  }

  const lastEntry = entries.find((entry) => entry.date === lastDate);
  return lastEntry?.missedOpportunities ?? [];
}
