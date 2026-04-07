import { NextResponse } from "next/server";
import { BUSINESS } from "@/config/business";
import { getActiveServices } from "@/config/services";
import { computeAnalytics } from "@/lib/analytics";
import { getTargetProgress } from "@/lib/analytics/targets";
import { generateActions } from "@/lib/actions/generateActions";
import { getBookings } from "@/lib/bookings";
import { getClients } from "@/lib/clients";
import type { DashboardPayload } from "@/lib/dashboard/types";
import { getTodayDateString } from "@/lib/date";
import { calculateDailyScore } from "@/lib/engagement/calculateDailyScore";
import { calculateProgress } from "@/lib/engagement/calculateProgress";
import { calculateStreak } from "@/lib/engagement/calculateStreak";
import { detectMissedOpportunities } from "@/lib/engagement/detectMissedOpportunities";
import {
  getAllDailyActionStates,
  getBehaviorSummary,
  getPreviousDayMissedOpportunities,
} from "@/lib/intelligence/behaviorTracker";
import { generateDailyBrief } from "@/lib/intelligence/generateDailyBrief";
import { generateDailyFlow } from "@/lib/intelligence/generateDailyFlow";
import { matchClientsToSlots } from "@/lib/intelligence/matchClientsToSlots";
import { prioritizeClients } from "@/lib/intelligence/prioritizeClients";
import { flattenInsights, generateInsights } from "@/lib/insights/generateInsights";
import { generateHeroMessage } from "@/lib/insights/generateHeroMessage";
import { getSettings } from "@/lib/settings";
import { getVisibleSlots } from "@/lib/slots";
import { detectGaps } from "@/lib/calendar/detectGaps";
import { EDMONTON_TIMEZONE } from "@/lib/time";

export async function GET() {
  try {
    const [bookings, settings, clients] = await Promise.all([getBookings(), getSettings(), getClients()]);
    const services = getActiveServices();
    const visibleSlots = await getVisibleSlots(
      settings.businessHours.start,
      settings.businessHours.end
    );
    const analytics = computeAnalytics(bookings, settings);
    const generatedInsights = generateInsights({
      bookings,
      services,
      clients,
      settings: {
        ...settings,
        visibleSlots,
      },
    });
    const insights = flattenInsights(generatedInsights);
    const today = getTodayDateString();
    const [behaviorSummary, previousMissedOpportunities, allActionStates] = await Promise.all([
      getBehaviorSummary(today),
      getPreviousDayMissedOpportunities(today),
      getAllDailyActionStates(),
    ]);
    const prioritizedClients = prioritizeClients({
      clients,
      bookings,
      today,
      suppressedClientIds: behaviorSummary.completedClientIds,
    });
    const gaps = detectGaps({
      bookings,
      businessHours: settings.businessHours,
      slotDuration: settings.slotDuration,
      slots: visibleSlots,
      date: today,
    });
    const slotMatches = matchClientsToSlots({
      gaps,
      prioritizedClients,
      bookings,
      topServiceName:
        typeof generatedInsights.topService?.data?.serviceName === "string"
          ? generatedInsights.topService.data.serviceName
          : null,
      today,
      suppressedClientIds: behaviorSummary.completedClientIds,
    });
    const actions = generateActions({
      insights: generatedInsights,
      slotMatches,
      prioritizedClients,
    });
    const targets = getTargetProgress({
      bookings,
      today,
      dailyTarget: settings.dailyTarget,
      weeklyTarget: settings.weeklyTarget,
      monthlyTarget: settings.monthlyTarget,
      yearlyTarget: settings.yearlyTarget,
    });
    const missedOpportunities = detectMissedOpportunities({
      bookings,
      slotMatches,
      prioritizedClients,
      executedActionIds: behaviorSummary.completedActionIds,
    });
    const completedBookings = bookings.filter(
      (booking) =>
        booking.type !== "blocked" &&
        booking.status === "completed" &&
        booking.date === today
    ).length;
    const dailyScore = calculateDailyScore({
      bookingsCompleted: completedBookings,
      actionsCompleted: behaviorSummary.executedCount,
      missedOpportunities: missedOpportunities.length,
    });
    const streak = calculateStreak(allActionStates);
    const progress = calculateProgress({
      bookings,
      today,
      weeklyTarget: settings.weeklyTarget,
    });
    const dailyBrief = generateDailyBrief({
      bookings: bookings.filter((booking) => booking.date === today),
      dailyTarget: settings.dailyTarget,
      revenueToday: analytics.todayRevenue,
      slotMatches,
      prioritizedClients,
      actions,
      missedOpportunities: previousMissedOpportunities,
    });
    const revenueGap = Math.max(settings.dailyTarget - analytics.todayRevenue, 0);
    const dailyFlow = generateDailyFlow({
      currentHour: Number(
        new Intl.DateTimeFormat("en-CA", {
          timeZone: EDMONTON_TIMEZONE,
          hour: "2-digit",
          hour12: false,
        }).format(new Date())
      ),
      bookingsToday: analytics.bookingsToday,
      revenueGap,
      slotMatches,
      prioritizedClients,
      actions,
    });

    const payload: DashboardPayload = {
      heroMessage: generateHeroMessage(BUSINESS.name.split(" ")[0] ?? BUSINESS.name, analytics.bookingsToday, insights),
      dailyBrief: {
        ...dailyBrief,
        recommendedAction:
          behaviorSummary.executedCount > 0
            ? `${dailyBrief.recommendedAction} You already moved on ${behaviorSummary.executedCount} action${behaviorSummary.executedCount === 1 ? "" : "s"} today.`
            : dailyBrief.recommendedAction,
      },
      dailyFlow,
      insights,
      actions,
      slotMatches,
      prioritizedClients: prioritizedClients.slice(0, 5).map((entry) => ({
        clientId: entry.clientId,
        name: entry.name,
        priorityScore: entry.priorityScore,
        reason: entry.reason,
        nextActionHint: entry.nextActionHint,
      })),
      targets,
      analytics: {
        revenueToday: analytics.todayRevenue,
        bookingsToday: analytics.bookingsToday,
        avgBooking: analytics.avgRevenuePerBooking,
        topService: analytics.mostPopularService,
        peakHour: analytics.busiestTimeSlots[0]?.slot ?? null,
      },
      engagement: {
        dailyScore,
        streak,
        actionState: {
          shownCount: behaviorSummary.shownCount,
          executedCount: behaviorSummary.executedCount,
          ignoredCount: behaviorSummary.ignoredCount,
          completedActionIds: behaviorSummary.completedActionIds,
        },
        missedOpportunities,
        progress,
      },
    };

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load dashboard.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
