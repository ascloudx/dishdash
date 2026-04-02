import { redis } from "@/lib/redis";
import type {
  AutomationAction,
  AutomationCycleReport,
  AutomationInsight,
  ClientAutomationState,
} from "@/lib/automation/types";

const CLIENT_STATE_KEY = "dira:client-state";
const AUTOMATION_REPORT_KEY = "dira:automation:report";

type ClientStateMap = Record<string, ClientAutomationState>;

export async function getClientAutomationStateMap() {
  return (await redis.getJSON<ClientStateMap>(CLIENT_STATE_KEY)) ?? {};
}

export async function updateClientAutomationState(
  phoneNormalized: string,
  updates: Partial<ClientAutomationState>
) {
  const current = await getClientAutomationStateMap();
  const existing = current[phoneNormalized] ?? {
    phoneNormalized,
    lastContactedAt: null,
    reactivationEligible: true,
  };

  current[phoneNormalized] = {
    ...existing,
    ...updates,
    phoneNormalized,
  };

  await redis.setJSON(CLIENT_STATE_KEY, current);
  return current[phoneNormalized];
}

export async function saveAutomationReport(report: AutomationCycleReport) {
  await redis.setJSON(AUTOMATION_REPORT_KEY, report);
}

export async function getAutomationReport() {
  return await redis.getJSON<AutomationCycleReport>(AUTOMATION_REPORT_KEY);
}

export function createAutomationReport(params: {
  reminders: AutomationAction[];
  reactivations: AutomationAction[];
  insights: AutomationInsight[];
}): AutomationCycleReport {
  return {
    generatedAt: new Date().toISOString(),
    reminders: params.reminders,
    reactivations: params.reactivations,
    insights: params.insights,
  };
}
