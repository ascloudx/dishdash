import type { Service } from "@/config/services";
import { detectGaps } from "@/lib/calendar/detectGaps";
import type { Client } from "@/types/client";
import type { Booking } from "@/types/booking";
import type { AppSettings } from "@/lib/settings";
import { formatBusinessTime, getTodayDateString } from "@/lib/date";
import { compareTimeStrings, isTimeWithinHours } from "@/lib/time";

export type Insight = {
  type: string;
  message: string;
  priority: "high" | "medium" | "low";
  data?: Record<string, string | number | string[] | null>;
};

export interface GeneratedInsights {
  lowBookingWarning: Insight | null;
  peakHours: Insight[];
  deadSlots: Insight[];
  topService: Insight | null;
  revenueGap: Insight | null;
}

type InsightSettings = AppSettings & {
  visibleSlots?: string[];
};

function activeBookings(bookings: Booking[]) {
  return bookings.filter(
    (booking) =>
      booking.type !== "blocked" &&
      booking.status !== "cancelled"
  );
}

function flattenPeakHours(slotCounts: Map<string, number>) {
  const highestCount = Math.max(...slotCounts.values());
  if (!Number.isFinite(highestCount)) {
    return [];
  }

  return [...slotCounts.entries()]
    .filter(([, count]) => count === highestCount)
    .sort((left, right) => compareTimeStrings(left[0], right[0]))
    .map(([slot, count]) => ({
      type: "peak_hours",
      message: `${formatBusinessTime(slot)} is one of your busiest booking windows.`,
      priority: "medium" as const,
      data: {
        slot,
        count,
      },
    }));
}

export function flattenInsights(insights: GeneratedInsights): Insight[] {
  return [
    insights.lowBookingWarning,
    ...insights.peakHours,
    ...insights.deadSlots,
    insights.topService,
    insights.revenueGap,
  ].filter((insight): insight is Insight => Boolean(insight));
}

export function generateInsights(params: {
  bookings: Booking[];
  services: Service[];
  clients: Client[];
  settings: InsightSettings;
}): GeneratedInsights {
  const today = getTodayDateString();
  const paidServiceIds = new Set(
    params.services
      .filter((service) => service.active && service.id !== "consultation")
      .map((service) => service.id)
  );
  const liveBookings = activeBookings(params.bookings).filter((booking) =>
    isTimeWithinHours(
      booking.time,
      params.settings.businessHours.start,
      params.settings.businessHours.end
    )
  );
  const todayBookings = liveBookings.filter((booking) => booking.date === today);
  const businessSlots = (params.settings.visibleSlots ?? []).filter((slot) =>
    isTimeWithinHours(
      slot,
      params.settings.businessHours.start,
      params.settings.businessHours.end
    )
  );
  const capacity = businessSlots.length;
  const utilization = capacity > 0 ? todayBookings.length / capacity : 0;

  const lowBookingWarning =
    capacity > 0 && utilization < 0.5
      ? {
          type: "low_bookings",
          message: `Only ${todayBookings.length} of ${capacity} available slots are filled today.`,
          priority: "high" as const,
          data: {
            bookingsToday: todayBookings.length,
            capacity,
            utilizationPercent: Math.round(utilization * 100),
            inactiveClients: params.clients.filter((client) => client.isInactive).length,
          },
        }
      : null;

  const slotCounts = new Map<string, number>();
  for (const booking of liveBookings) {
    const current = slotCounts.get(booking.time) ?? 0;
    slotCounts.set(booking.time, current + 1);
  }
  const peakHours = flattenPeakHours(slotCounts);

  const deadSlots = detectGaps({
    bookings: liveBookings,
    businessHours: params.settings.businessHours,
    slotDuration: params.settings.slotDuration,
    slots: businessSlots,
    date: today,
  }).map((gap) => ({
    type: "dead_slot",
    message: `${formatBusinessTime(gap.slot)} is open inside working hours and worth promoting.`,
    priority: gap.priorityScore >= 45 ? "high" as const : "medium" as const,
    data: {
      slot: gap.slot,
      priorityScore: gap.priorityScore,
    },
  }));

  const serviceCounts = new Map<string, { serviceName: string; count: number }>();
  for (const booking of liveBookings) {
    if (!paidServiceIds.has(booking.serviceId)) {
      continue;
    }
    const existing = serviceCounts.get(booking.serviceId) ?? {
      serviceName: booking.serviceName,
      count: 0,
    };
    serviceCounts.set(booking.serviceId, {
      serviceName: existing.serviceName,
      count: existing.count + 1,
    });
  }
  const topServiceEntry = [...serviceCounts.entries()].sort((left, right) => right[1].count - left[1].count)[0];
  const topService = topServiceEntry
    ? {
        type: "top_service",
        message: `${topServiceEntry[1].serviceName} is your most-booked paid service right now.`,
        priority: "low" as const,
        data: {
          serviceId: topServiceEntry[0],
          serviceName: topServiceEntry[1].serviceName,
          count: topServiceEntry[1].count,
        },
      }
    : null;

  const revenueToday = todayBookings.reduce((total, booking) => total + booking.price, 0);
  const revenueGapAmount = Math.max(params.settings.dailyTarget - revenueToday, 0);
  const revenueGap =
    revenueGapAmount > 0
      ? {
          type: "revenue_gap",
          message: `You are ${params.settings.currency} ${revenueGapAmount.toLocaleString("en-CA")} below today's target.`,
          priority: revenueGapAmount >= params.settings.dailyTarget * 0.5 ? "high" as const : "medium" as const,
          data: {
            revenueToday,
            target: params.settings.dailyTarget,
            gap: revenueGapAmount,
          },
        }
      : null;

  return {
    lowBookingWarning,
    peakHours,
    deadSlots,
    topService,
    revenueGap,
  };
}
