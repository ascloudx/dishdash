import { getTodayDateString, isOlderThanDays } from "@/lib/date";

export type ScoredClientTag = "VIP" | "Regular" | "New" | "At Risk";

export interface ScoredClient {
  score: number;
  tag: ScoredClientTag;
}

export function scoreClient(params: {
  totalVisits: number;
  totalSpent: number;
  lastVisit: string;
  today?: string;
}): ScoredClient {
  const today = params.today ?? getTodayDateString();
  const isAtRisk = params.lastVisit ? isOlderThanDays(params.lastVisit, today, 35) : false;
  const recencyBonus = params.lastVisit
    ? isOlderThanDays(params.lastVisit, today, 35)
      ? 0
      : isOlderThanDays(params.lastVisit, today, 14)
        ? 8
        : 16
    : 0;

  const score = Math.round(params.totalVisits * 12 + params.totalSpent / 10 + recencyBonus);

  if (isAtRisk) {
    return { score, tag: "At Risk" };
  }

  if (params.totalVisits >= 4 || params.totalSpent >= 250) {
    return { score, tag: "VIP" };
  }

  if (params.totalVisits >= 2) {
    return { score, tag: "Regular" };
  }

  return { score, tag: "New" };
}
