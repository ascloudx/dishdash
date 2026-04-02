import { getAutomationReport } from "@/lib/automation/state";
import { runAutomationCycle } from "@/lib/cron/runner";

const MAX_REPORT_AGE_MS = 15 * 60 * 1000;

export async function ensureAutomationReport() {
  const current = await getAutomationReport();

  if (!current) {
    return runAutomationCycle();
  }

  const age = Date.now() - new Date(current.generatedAt).getTime();
  if (age > MAX_REPORT_AGE_MS) {
    return runAutomationCycle();
  }

  return current;
}
