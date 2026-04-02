import type { GeneratedInsights } from "@/lib/insights/generateInsights";

export interface GeneratedAction {
  title: string;
  reason: string;
  dataReference: string;
}

export function generateActions(insights: GeneratedInsights): GeneratedAction[] {
  const actions: GeneratedAction[] = [];

  if (insights.deadSlots.length > 0) {
    const topDeadSlot = insights.deadSlots[0];
    const slot =
      typeof topDeadSlot.data?.slot === "string" ? topDeadSlot.data.slot : "an open slot";
    actions.push({
      title: `Promote ${slot}`,
      reason: topDeadSlot.message,
      dataReference: `dead_slot:${slot}`,
    });
  }

  if (insights.lowBookingWarning) {
    actions.push({
      title: "Message inactive clients",
      reason: insights.lowBookingWarning.message,
      dataReference: "low_bookings:capacity",
    });
  }

  if (insights.revenueGap) {
    actions.push({
      title: "Push a same-day offer",
      reason: insights.revenueGap.message,
      dataReference: "revenue_gap:daily_target",
    });
  }

  if (insights.topService) {
    const serviceName =
      typeof insights.topService.data?.serviceName === "string"
        ? insights.topService.data.serviceName
        : "top service";
    actions.push({
      title: `Feature ${serviceName}`,
      reason: insights.topService.message,
      dataReference: `top_service:${serviceName}`,
    });
  }

  if (insights.peakHours.length > 0) {
    const peakSlot =
      typeof insights.peakHours[0]?.data?.slot === "string"
        ? insights.peakHours[0].data.slot
        : "peak window";
    actions.push({
      title: "Review peak-hour pricing",
      reason: insights.peakHours[0].message,
      dataReference: `peak_hours:${peakSlot}`,
    });
  }

  return actions;
}
