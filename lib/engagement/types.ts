export interface MissedOpportunity {
  id: string;
  title: string;
  reason: string;
  estimatedValue: number;
}

export interface WeeklyProgress {
  currentRevenue: number;
  targetRevenue: number;
  progressPercent: number;
  lastWeekRevenue: number;
  differenceFromLastWeek: number;
}
