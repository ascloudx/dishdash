import { ensureAutomationReport } from "@/lib/automation/report";
import type { AutomationAction } from "@/lib/automation/types";

export interface ActionItem {
  key: string;
  type: "reminder_24h" | "reminder_2h" | "reactivation";
  name: string;
  phone: string;
  service: string;
  label: string;
  whatsappLink: string | null;
  helper: string;
}

export interface TodayFocusSummary {
  recommendedActions: string[];
  keyInsights: string[];
  counts: {
    reminders24h: number;
    reminders2h: number;
    reactivations: number;
  };
}

function isTodayAction(action: AutomationAction): action is AutomationAction & {
  type: "reminder_24h" | "reminder_2h" | "reactivation";
} {
  return (
    action.type === "reminder_24h" ||
    action.type === "reminder_2h" ||
    action.type === "reactivation"
  );
}

export async function getTodayActions(): Promise<ActionItem[]> {
  const report = await ensureAutomationReport();

  return [...report.reminders, ...report.reactivations]
    .filter(isTodayAction)
    .map((action) => ({
      key: action.key,
      type: action.type,
      name: action.name,
      phone: action.phone,
      service: action.serviceName ?? "Follow-up",
      label:
        action.type === "reminder_24h"
          ? "24h reminder"
          : action.type === "reminder_2h"
            ? "2h reminder"
            : "Reactivation",
      whatsappLink: action.whatsappLink,
      helper: action.helper,
    }));
}

export async function getTodayFocusSummary(): Promise<TodayFocusSummary> {
  const report = await ensureAutomationReport();
  const reminders24h = report.reminders.filter((action) => action.type === "reminder_24h").length;
  const reminders2h = report.reminders.filter((action) => action.type === "reminder_2h").length;
  const reactivations = report.reactivations.length;

  return {
    recommendedActions: [
      reminders24h > 0 ? "Send tomorrow reminders" : "No 24h reminders queued",
      reminders2h > 0 ? "Prepare 2-hour reminder outreach" : "No near-term reminders queued",
      reactivations > 0 ? "Contact inactive clients" : "No reactivation backlog",
    ],
    keyInsights: report.insights.map((insight) => insight.message),
    counts: {
      reminders24h,
      reminders2h,
      reactivations,
    },
  };
}
