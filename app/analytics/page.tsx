'use client';

import { useState, useEffect, useCallback } from "react";
import StatsCard from "@/components/StatsCard";
import type { AnalyticsData } from "@/lib/analytics";
import { BUSINESS } from "@/config/business";
import { formatBusinessTime } from "@/lib/date";

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch("/api/analytics", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Request failed");
      }
      const json: AnalyticsData = await res.json();
      setData(json);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="space-y-12 animate-pulse">
        <div className="h-10 w-56 bg-gray-200 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((index) => <div key={index} className="h-32 rounded-2xl bg-gray-100" />)}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-64 text-text-sub">
        <p>Failed to load analytics. Please try again.</p>
      </div>
    );
  }

  const services = Object.entries(data.revenuePerService).sort(([, a], [, b]) => b - a);
  const maxServiceRevenue = services[0]?.[1] || 1;

  return (
    <div className="space-y-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-text-main">
            Analytics <span>📊</span>
          </h2>
          <p className="text-text-sub mt-1">
            Every insight here is computed from real bookings and the live service catalog.
          </p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchAnalytics();
          }}
          className="rounded-full border border-white/80 bg-white/80 px-4 py-2.5 text-sm font-semibold text-text-sub"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          label="Total Revenue"
          value={data.totalRevenue}
          icon="💰"
          accent="rose"
          sub={`${data.totalBookings} bookings`}
        />
        <StatsCard
          label="Today's Revenue"
          value={data.todayRevenue}
          icon="📆"
          accent="gold"
          sub={`${data.bookingsToday} bookings today`}
        />
        <StatsCard
          label="Weekly Revenue"
          value={data.weeklyRevenue}
          icon="📈"
          accent="blue"
          sub="Last 7 days"
        />
        <StatsCard
          label="Avg per Booking"
          value={`${BUSINESS.currency}${data.avgRevenuePerBooking.toLocaleString(BUSINESS.locale)}`}
          icon="🧾"
          accent="green"
          sub="Live average"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {data.insights.map((insight) => (
          <div key={insight} className="glass rounded-2xl p-5 text-sm text-text-main shadow-sm">
            {insight}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass rounded-3xl p-8 space-y-6">
          <h3 className="text-xl font-bold text-text-main">Revenue by Service</h3>
          <div className="space-y-5">
            {services.map(([service, revenue]) => {
              const pct = Math.round((revenue / maxServiceRevenue) * 100);
              return (
                <div key={service} className="space-y-1.5">
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="font-medium text-text-main truncate">{service}</span>
                    <span className="font-bold text-brand shrink-0 text-right">
                      {BUSINESS.currency}{revenue.toLocaleString(BUSINESS.locale)}
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-bg-soft overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand to-brand-soft transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass rounded-3xl p-8 space-y-6">
          <h3 className="text-xl font-bold text-text-main">Busiest Time Slots</h3>
          <div className="space-y-4">
            {data.busiestTimeSlots.map((slot, index) => {
              const maxCount = data.busiestTimeSlots[0]?.count || 1;
              const pct = Math.round((slot.count / maxCount) * 100);
              return (
                <div key={slot.slot} className="space-y-1.5">
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="font-medium text-text-main">{formatBusinessTime(slot.slot)}</span>
                    <span className="font-bold text-blue-600 whitespace-nowrap">
                      {slot.count} booking{slot.count !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-bg-soft overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background:
                          index === 0
                            ? "linear-gradient(90deg, #C75C6E, #E8AEB7)"
                            : "linear-gradient(90deg, #6C8CF5, #a5b4fc)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {data.lowDemandTimeSlots.length > 0 ? (
            <div className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-100">
              <p className="text-sm font-semibold text-amber-700">
                Fill {formatBusinessTime(data.lowDemandTimeSlots[0].slot)}
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                This slot is one of your lightest windows right now.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
