"use client";

import { useEffect, useState } from "react";
import { BUSINESS } from "@/config/business";

interface AnalyticsSnapshot {
  insights: string[];
  weeklyRevenue: number;
}

interface FocusSummary {
  recommendedActions: string[];
  keyInsights: string[];
  counts: {
    reminders24h: number;
    reminders2h: number;
    reactivations: number;
  };
}

export default function OwnerFocusPanel({
  todayRevenue,
  totalBookingsToday,
}: {
  todayRevenue: number;
  totalBookingsToday: number;
}) {
  const [analytics, setAnalytics] = useState<AnalyticsSnapshot | null>(null);
  const [focus, setFocus] = useState<FocusSummary | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [analyticsResponse, actionsResponse] = await Promise.all([
          fetch("/api/analytics", { cache: "no-store" }),
          fetch("/api/actions/today", { cache: "no-store" }),
        ]);

        if (!analyticsResponse.ok || !actionsResponse.ok) {
          throw new Error("Failed to load focus");
        }

        const analyticsPayload = (await analyticsResponse.json()) as AnalyticsSnapshot;
        const actionsPayload = (await actionsResponse.json()) as Array<{
          type: "reminder_24h" | "reminder_2h" | "reactivation";
        }>;
        const reminders24h = actionsPayload.filter((action) => action.type === "reminder_24h").length;
        const reminders2h = actionsPayload.filter((action) => action.type === "reminder_2h").length;
        const reactivations = actionsPayload.filter((action) => action.type === "reactivation").length;

        if (active) {
          setAnalytics(analyticsPayload);
          setFocus({
            keyInsights: [
              `${reminders24h} reminders pending`,
              `${reminders2h} bookings entering the 2-hour window`,
              `${reactivations} inactive clients eligible for outreach`,
            ],
            recommendedActions: [
              reminders24h > 0 ? "Send 24-hour reminders" : "Review tomorrow schedule",
              reminders2h > 0 ? "Send 2-hour reminders" : "No urgent reminder queue",
              reactivations > 0 ? "Message overdue clients" : "No reactivation backlog today",
              totalBookingsToday > 0 ? "Prep today’s booked services first" : "Promote open slots for today",
            ],
            counts: { reminders24h, reminders2h, reactivations },
          });
        }
      } catch (error) {
        console.error(error);
      }
    }

    load();
    const interval = setInterval(load, 15000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [totalBookingsToday]);

  const revenuePct = Math.min(Math.round((todayRevenue / BUSINESS.dailyRevenueTarget) * 100), 100);

  return (
    <section className="soft-panel relative overflow-hidden rounded-[2rem] border border-white/70 p-6 lg:p-8">
      <div className="absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.75),_transparent_65%)]" />
      <div className="relative z-10 grid gap-8 lg:grid-cols-[1.3fr_0.9fr]">
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand/70">Today Focus</p>
            <h2 className="text-3xl font-semibold tracking-tight text-text-main lg:text-4xl">
              Run the day from live bookings, not guesses.
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-text-sub">
              Revenue, today’s load, reminders, and inactive clients are derived from the stored booking data in real time.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <FocusStat
              label="Revenue Today"
              value={`${BUSINESS.currency}${todayRevenue.toLocaleString(BUSINESS.locale)}`}
              helper={`${revenuePct}% of target`}
            />
            <FocusStat label="Bookings Today" value={totalBookingsToday} helper="Live schedule count" />
            <FocusStat
              label="Weekly Revenue"
              value={`${BUSINESS.currency}${(analytics?.weeklyRevenue ?? 0).toLocaleString(BUSINESS.locale)}`}
              helper="Last 7 days"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <GlassList title="Key Insights" items={focus?.keyInsights ?? analytics?.insights ?? []} />
            <GlassList title="Recommended Actions" items={focus?.recommendedActions ?? []} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="soft-inset rounded-[1.75rem] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-sub">Revenue Target</p>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/70">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#df8997,#f3bac5,#f6d9df)] transition-all duration-500"
                style={{ width: `${revenuePct}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-sm text-text-sub">
              <span>{BUSINESS.currency}{todayRevenue.toLocaleString(BUSINESS.locale)}</span>
              <span>{BUSINESS.currency}{BUSINESS.dailyRevenueTarget.toLocaleString(BUSINESS.locale)}</span>
            </div>
          </div>

          <div className="soft-inset rounded-[1.75rem] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-sub">Quick Actions</p>
            <div className="mt-4 grid gap-3">
              <QuickLink href="/bookings" label="Add booking" />
              <QuickLink href="/bookings" label="Edit today’s bookings" />
              <QuickLink href="/clients" label="Open client list" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FocusStat({ label, value, helper }: { label: string; value: string | number; helper: string }) {
  return (
    <div className="soft-inset rounded-[1.5rem] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-sub">{label}</p>
      <p className="mt-2 text-xl sm:text-2xl font-semibold text-text-main truncate">{value}</p>
      <p className="mt-1 text-xs text-text-sub truncate">{helper}</p>
    </div>
  );
}

function GlassList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="soft-inset rounded-[1.5rem] p-4">
      <p className="text-sm font-semibold text-text-main">{title}</p>
      <div className="mt-3 space-y-2">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item} className="rounded-2xl bg-white/65 px-3 py-2 text-sm text-text-sub shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              {item}
            </div>
          ))
        ) : (
          <p className="text-sm text-text-sub">No live recommendations yet.</p>
        )}
      </div>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="rounded-2xl bg-white/75 px-4 py-3 text-sm font-semibold text-text-main shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_12px_24px_rgba(215,181,188,0.18)] transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.99]"
    >
      {label}
    </a>
  );
}
