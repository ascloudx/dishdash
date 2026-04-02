import type { Insight } from "@/lib/insights/generateInsights";
import type { GeneratedAction } from "@/lib/actions/generateActions";
import type { TargetProgress } from "@/lib/analytics/targets";

export interface DashboardPayload {
  heroMessage: string;
  insights: Insight[];
  actions: GeneratedAction[];
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
}
