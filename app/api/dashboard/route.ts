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
import { flattenInsights, generateInsights } from "@/lib/insights/generateInsights";
import { generateHeroMessage } from "@/lib/insights/generateHeroMessage";
import { getSettings } from "@/lib/settings";
import { getVisibleSlots } from "@/lib/slots";

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
    const actions = generateActions(generatedInsights);
    const today = getTodayDateString();
    const targets = getTargetProgress({
      bookings,
      today,
      dailyTarget: settings.dailyTarget,
      weeklyTarget: settings.weeklyTarget,
      monthlyTarget: settings.monthlyTarget,
      yearlyTarget: settings.yearlyTarget,
    });

    const payload: DashboardPayload = {
      heroMessage: generateHeroMessage(BUSINESS.name.split(" ")[0] ?? BUSINESS.name, analytics.bookingsToday, insights),
      insights,
      actions,
      targets,
      analytics: {
        revenueToday: analytics.todayRevenue,
        bookingsToday: analytics.bookingsToday,
        avgBooking: analytics.avgRevenuePerBooking,
        topService: analytics.mostPopularService,
        peakHour: analytics.busiestTimeSlots[0]?.slot ?? null,
      },
    };

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load dashboard.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
