"use client";

import type { DashboardPayload } from "@/lib/dashboard/types";
import { BUSINESS } from "@/config/business";

interface OwnerFocusPanelProps {
  data: DashboardPayload;
}

const targetConfig = [
  { key: "daily", label: "Daily Target" },
  { key: "weekly", label: "Weekly Target" },
  { key: "monthly", label: "Monthly Target" },
  { key: "yearly", label: "Yearly Target" },
] as const;

const priorityStyles = {
  high: "border-rose-100 bg-rose-50/80 text-rose-700",
  medium: "border-amber-100 bg-amber-50/80 text-amber-700",
  low: "border-blue-100 bg-blue-50/80 text-blue-700",
} as const;

export default function OwnerFocusPanel({ data }: OwnerFocusPanelProps) {
  return (
    <section className="glass rounded-[2rem] p-6 md:p-8 shadow-premium">
      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="space-y-6">
          <div className="space-y-3">
            <span className="inline-flex rounded-full border border-white/70 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-text-sub">
              Live Command View
            </span>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight text-text-main md:text-4xl">
                {data.heroMessage}
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-text-sub">
                Live metrics are computed from stored bookings and settings each time this dashboard loads.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                Live Insights
              </p>
              <div className="mt-4 space-y-3">
                {data.insights.length > 0 ? (
                  data.insights.map((insight, index) => (
                    <div
                      key={`${insight.type}-${index}`}
                      className="rounded-2xl border border-white/80 bg-white/90 p-3 shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${priorityStyles[insight.priority]}`}
                        >
                          {insight.priority}
                        </span>
                        <p className="text-sm leading-6 text-text-main">{insight.message}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl border border-dashed border-brand-light p-4 text-sm text-text-sub">
                    No live insights right now.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                Recommended Actions
              </p>
              <div className="mt-4 space-y-3">
                {data.actions.length > 0 ? (
                  data.actions.map((action) => (
                    <div
                      key={action.dataReference}
                      className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3 shadow-sm"
                    >
                      <p className="text-sm font-semibold leading-6 text-emerald-900">{action.title}</p>
                      <p className="mt-1 text-xs leading-5 text-emerald-800/80">{action.reason}</p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl border border-dashed border-brand-light p-4 text-sm text-text-sub">
                    No immediate actions suggested from live data.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-[1.75rem] border border-white/80 bg-white/80 p-5 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              label="Revenue Today"
              value={`${BUSINESS.currency}${data.analytics.revenueToday.toLocaleString(BUSINESS.locale)}`}
            />
            <MetricCard
              label="Bookings Today"
              value={String(data.analytics.bookingsToday)}
            />
            <MetricCard
              label="Average Booking"
              value={`${BUSINESS.currency}${data.analytics.avgBooking.toLocaleString(BUSINESS.locale)}`}
            />
            <MetricCard
              label="Peak Hour"
              value={data.analytics.peakHour ?? "—"}
            />
          </div>

          <div className="rounded-3xl border border-white/80 bg-gradient-to-br from-rose-50/80 via-white to-blue-50/60 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                  Target Progress
                </p>
                <p className="text-sm text-text-sub">
                  Based on live revenue totals and your saved goals.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {targetConfig.map(({ key, label }) => {
                const target = data.targets[key];
                return (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-text-main">{label}</span>
                      <span className="text-text-sub">
                        {BUSINESS.currency}
                        {target.current.toLocaleString(BUSINESS.locale)} / {BUSINESS.currency}
                        {target.target.toLocaleString(BUSINESS.locale)}
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-white/90">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand via-rose-400 to-amber-300 transition-all duration-500"
                        style={{ width: `${Math.min(target.progress, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold text-text-main">{value}</p>
    </div>
  );
}
