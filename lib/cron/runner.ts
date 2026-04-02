import { runInsightsEngine } from "@/lib/automation/insights";
import { runReactivationEngine } from "@/lib/automation/reactivation";
import { runReminderEngine } from "@/lib/automation/reminders";
import { createAutomationReport, saveAutomationReport } from "@/lib/automation/state";

export async function runAutomationCycle(now = new Date()) {
  const reminders = await runReminderEngine(now);
  const reactivations = await runReactivationEngine(now);
  const insights = await runInsightsEngine();

  const report = createAutomationReport({
    reminders,
    reactivations,
    insights,
  });

  await saveAutomationReport(report);
  return report;
}
