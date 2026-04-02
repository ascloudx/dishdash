import { getAnalytics } from "@/lib/analytics";
import { getAutomationReport } from "@/lib/automation/state";
import { runInsightsEngine } from "@/lib/automation/insights";
import { getBookings } from "@/lib/bookings";
import { getHoursUntil, getTodayDateString } from "@/lib/date";
import { getSettings } from "@/lib/settings";
import { getVisibleSlots } from "@/lib/slots";
import { compareTimeStrings } from "@/lib/time";
import { buildUrgentMessage, generateWhatsAppLink } from "@/lib/whatsapp";

export type CommandCenterActionBucket = "urgent" | "today" | "optimize";
export type CommandCenterActionSource = "insight" | "system" | "schedule";
export type CommandCenterActionType = "message" | "booking" | "review";

export interface CommandCenterAction {
  id: string;
  title: string;
  description: string;
  type: CommandCenterActionBucket;
  source: CommandCenterActionSource;
  actionType: CommandCenterActionType;
  relatedBookingId?: string;
  relatedClientId?: string;
  priorityScore: number;
  href?: string;
}

export interface CommandCenterOutput {
  urgent: CommandCenterAction[];
  today: CommandCenterAction[];
  optimize: CommandCenterAction[];
}

function scoreAction(params: {
  urgency: number;
  revenueImpact: number;
  timeSensitivity: number;
}) {
  return params.urgency + params.revenueImpact + params.timeSensitivity;
}

function sortAndLimit(actions: CommandCenterAction[], limit: number) {
  return actions
    .sort((left, right) => right.priorityScore - left.priorityScore)
    .slice(0, limit);
}

function fallbackAction(type: CommandCenterActionBucket): CommandCenterAction {
  const copy = {
    urgent: {
      title: "No urgent actions",
      description: "You're on track right now.",
    },
    today: {
      title: "No immediate today actions",
      description: "Today's plan is stable from the current live data.",
    },
    optimize: {
      title: "No optimization pressure",
      description: "Current trends do not require a change right now.",
    },
  } as const;

  return {
    id: `fallback:${type}`,
    title: copy[type].title,
    description: copy[type].description,
    type,
    source: "system",
    actionType: "review",
    priorityScore: 0,
  };
}

export async function getCommandCenterActions(): Promise<CommandCenterOutput> {
  const [bookings, analytics, settings, report] = await Promise.all([
    getBookings(),
    getAnalytics(),
    getSettings(),
    getAutomationReport(),
  ]);

  const insights = report?.insights?.length ? report.insights : await runInsightsEngine();
  const today = getTodayDateString();
  const visibleSlots = (await getVisibleSlots(
    settings.businessHours.start,
    settings.businessHours.end
  )).sort(compareTimeStrings);

  const activeTodayBookings = bookings.filter(
    (booking) =>
      booking.type !== "blocked" &&
      booking.status !== "cancelled" &&
      booking.date === today
  );
  const bookedSlots = new Set(activeTodayBookings.map((booking) => booking.time));
  const freeSlots = visibleSlots.filter((slot) => !bookedSlots.has(slot));

  const urgent: CommandCenterAction[] = [];
  const todayActions: CommandCenterAction[] = [];
  const optimize: CommandCenterAction[] = [];

  const pendingReminders = report?.reminders ?? [];
  for (const reminder of pendingReminders) {
    urgent.push({
      id: `urgent:reminder:${reminder.key}`,
      title: reminder.type === "reminder_2h" ? "Send 2-hour reminder" : "Send appointment reminder",
      description: `${reminder.name} for ${reminder.serviceName ?? "appointment"} at ${reminder.helper.replace(/^.* at /, "")}.`,
      type: "urgent",
      source: "system",
      actionType: "message",
      relatedBookingId: reminder.bookingId,
      priorityScore: scoreAction({
        urgency: reminder.type === "reminder_2h" ? 5 : 4,
        revenueImpact: 3,
        timeSensitivity: reminder.type === "reminder_2h" ? 5 : 3,
      }),
      href: reminder.whatsappLink ?? undefined,
    });
  }

  for (const booking of activeTodayBookings) {
    const hoursUntil = getHoursUntil(booking.date, booking.time);
    if (hoursUntil > 0 && hoursUntil <= 2 && !pendingReminders.some((reminder) => reminder.bookingId === booking.id)) {
      urgent.push({
        id: `urgent:confirm:${booking.id}`,
        title: "Confirm upcoming appointment",
        description: `${booking.name} is booked for ${booking.serviceName} at ${booking.time}.`,
        type: "urgent",
        source: "schedule",
        actionType: "message",
        relatedBookingId: booking.id,
        priorityScore: scoreAction({
          urgency: 5,
          revenueImpact: booking.price > 0 ? 4 : 2,
          timeSensitivity: 5,
        }),
        href: booking.phoneValid
          ? generateWhatsAppLink(
              booking.phoneNormalized || booking.phone,
              buildUrgentMessage(booking.name, booking.time)
            )
          : undefined,
      });
    }
  }

  const immediateGap = freeSlots.find((slot) => {
    const hoursUntil = getHoursUntil(today, slot);
    return hoursUntil >= 0 && hoursUntil <= 2;
  });
  if (immediateGap) {
    urgent.push({
      id: `urgent:gap:${today}:${immediateGap}`,
      title: "Fill the next open slot",
      description: `You have an unbooked slot at ${immediateGap}.`,
      type: "urgent",
      source: "schedule",
      actionType: "booking",
      priorityScore: scoreAction({
        urgency: 5,
        revenueImpact: 4,
        timeSensitivity: 5,
      }),
      href: "/bookings",
    });
  }

  if (activeTodayBookings.length <= 1) {
    todayActions.push({
      id: `today:low-bookings:${today}`,
      title: "Send reactivation messages",
      description: "Today's booking count is low. Reach out to inactive clients to fill demand.",
      type: "today",
      source: "insight",
      actionType: "message",
      priorityScore: scoreAction({
        urgency: 3,
        revenueImpact: 5,
        timeSensitivity: 3,
      }),
      href: "/clients",
    });
  }

  const revenueGap = Math.max(settings.dailyTarget - analytics.todayRevenue, 0);
  if (revenueGap > 0) {
    todayActions.push({
      id: `today:revenue-gap:${today}`,
      title: "Close today's revenue gap",
      description: `You are ${settings.currency} ${revenueGap.toLocaleString("en-CA")} below today's target.`,
      type: "today",
      source: "system",
      actionType: "booking",
      priorityScore: scoreAction({
        urgency: 4,
        revenueImpact: 5,
        timeSensitivity: 3,
      }),
      href: "/analytics",
    });
  }

  if (freeSlots.length > 0) {
    todayActions.push({
      id: `today:promote-gaps:${today}`,
      title: "Promote today's open slots",
      description: `Open availability remains at ${freeSlots.slice(0, 2).join(" and ")}.`,
      type: "today",
      source: "schedule",
      actionType: "booking",
      priorityScore: scoreAction({
        urgency: 3,
        revenueImpact: 4,
        timeSensitivity: 4,
      }),
      href: "/bookings",
    });
  }

  if (analytics.mostPopularService) {
    optimize.push({
      id: `optimize:top-service:${analytics.mostPopularService}`,
      title: "Promote your top service",
      description: `${analytics.mostPopularService} is leading demand and is worth featuring today.`,
      type: "optimize",
      source: "insight",
      actionType: "review",
      priorityScore: scoreAction({
        urgency: 2,
        revenueImpact: 4,
        timeSensitivity: 1,
      }),
      href: "/analytics",
    });
  }

  const reconnectCandidates = (report?.reactivations ?? []).slice(0, 5);
  for (const candidate of reconnectCandidates) {
    optimize.push({
      id: `optimize:reactivation:${candidate.key}`,
      title: "Reconnect an inactive client",
      description: `${candidate.name} is eligible for a follow-up message.`,
      type: "optimize",
      source: "system",
      actionType: "message",
      relatedClientId: candidate.clientId,
      priorityScore: scoreAction({
        urgency: 2,
        revenueImpact: 4,
        timeSensitivity: 1,
      }),
      href: candidate.whatsappLink ?? undefined,
    });
  }

  const bestPaidPeak = analytics.busiestTimeSlots[0];
  if (bestPaidPeak) {
    optimize.push({
      id: `optimize:pricing:${bestPaidPeak.slot}`,
      title: "Review peak-slot pricing",
      description: `${bestPaidPeak.slot} is the busiest window right now. Review whether premium pricing fits that demand.`,
      type: "optimize",
      source: "insight",
      actionType: "review",
      priorityScore: scoreAction({
        urgency: 1,
        revenueImpact: 3,
        timeSensitivity: 1,
      }),
      href: "/dashboard/settings",
    });
  }

  for (const insight of insights) {
    if (insight.type === "gap_alert" && !todayActions.some((action) => action.id.startsWith("today:promote-gaps"))) {
      todayActions.push({
        id: `today:insight-gap:${today}`,
        title: "Use the open gap",
        description: insight.message,
        type: "today",
        source: "insight",
        actionType: "booking",
        priorityScore: scoreAction({
          urgency: 3,
          revenueImpact: 3,
          timeSensitivity: 3,
        }),
        href: "/bookings",
      });
    }
  }

  const result: CommandCenterOutput = {
    urgent: sortAndLimit(urgent, 3),
    today: sortAndLimit(todayActions, 5),
    optimize: sortAndLimit(optimize, 5),
  };

  if (result.urgent.length === 0) {
    result.urgent = [fallbackAction("urgent")];
  }
  if (result.today.length === 0) {
    result.today = [fallbackAction("today")];
  }
  if (result.optimize.length === 0) {
    result.optimize = [fallbackAction("optimize")];
  }

  return result;
}
