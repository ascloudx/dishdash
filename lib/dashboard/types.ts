import type { Insight } from "@/lib/insights/generateInsights";
import type { GeneratedAction } from "@/lib/actions/generateActions";
import type { TargetProgress } from "@/lib/analytics/targets";
import type { DailyBrief } from "@/lib/intelligence/generateDailyBrief";
import type { DailyFlow } from "@/lib/intelligence/generateDailyFlow";
import type { SlotMatch } from "@/lib/intelligence/matchClientsToSlots";
import type { PrioritizedClient } from "@/lib/intelligence/prioritizeClients";
import type { MissedOpportunity, WeeklyProgress } from "@/lib/engagement/types";

export interface DashboardPayload {
  heroMessage: string;
  dailyBrief: DailyBrief;
  dailyFlow: DailyFlow;
  insights: Insight[];
  actions: GeneratedAction[];
  slotMatches: SlotMatch[];
  prioritizedClients: Array<Pick<PrioritizedClient, "clientId" | "name" | "priorityScore" | "reason" | "nextActionHint">>;
  targets: {
    daily: TargetProgress;
    weekly: TargetProgress;
    monthly: TargetProgress;
    yearly: TargetProgress;
  };
  analytics: {
    revenueToday: number;
    bookingsToday: number;
    avgBooking: number;
    topService: string | null;
    peakHour: string | null;
  };
  engagement: {
    dailyScore: number;
    streak: number;
    actionState: {
      shownCount: number;
      executedCount: number;
      ignoredCount: number;
      completedActionIds: string[];
    };
    missedOpportunities: MissedOpportunity[];
    progress: WeeklyProgress;
  };
}
