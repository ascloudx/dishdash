"use client";

import { useMemo, useState } from "react";
import { BUSINESS } from "@/config/business";
import type { DashboardPayload } from "@/lib/dashboard/types";
import { timeToMinutes } from "@/lib/time";

interface OwnerFocusPanelProps {
  data: DashboardPayload;
}

type PanelMode = "focus" | "analyze";

const priorityStyles = {
  high: "border-rose-100 bg-rose-50/80 text-rose-700",
  medium: "border-amber-100 bg-amber-50/80 text-amber-700",
  low: "border-blue-100 bg-blue-50/80 text-blue-700",
} as const;

export default function OwnerFocusPanel({ data }: OwnerFocusPanelProps) {
  const [mode, setMode] = useState<PanelMode>("focus");
  const [optimisticCompletedActionIds, setOptimisticCompletedActionIds] = useState<string[]>([]);
  const trackedBriefSummary = useMemo(
    () => `${data.dailyBrief.performance} ${data.dailyBrief.gapVsTarget}`.trim(),
    [data.dailyBrief.gapVsTarget, data.dailyBrief.performance]
  );
  const completedActionIds = useMemo(
    () =>
      Array.from(
        new Set([
          ...data.engagement.actionState.completedActionIds,
          ...optimisticCompletedActionIds,
        ])
      ),
    [data.engagement.actionState.completedActionIds, optimisticCompletedActionIds]
  );
  const pendingActions = useMemo(
    () => data.actions.filter((action) => !completedActionIds.includes(action.id)),
    [completedActionIds, data.actions]
  );
  const primaryAction = pendingActions[0] ?? data.actions[0] ?? null;
  const queuedActionCount = Math.max(pendingActions.length - 1, 0);
  const highPriorityInsights = data.insights
    .filter((insight) => insight.priority === "high")
    .slice(0, 2);
  const primaryOpportunity = useMemo(() => {
    if (!primaryAction) {
      return data.engagement.missedOpportunities[0] ?? null;
    }

    return (
      data.engagement.missedOpportunities.find((opportunity) => {
        if (primaryAction.slot && opportunity.title.includes(primaryAction.slot)) {
          return true;
        }

        return opportunity.reason === primaryAction.reason;
      }) ??
      data.engagement.missedOpportunities[0] ??
      null
    );
  }, [data.engagement.missedOpportunities, primaryAction]);

  const estimatedValue =
    primaryOpportunity?.estimatedValue ??
    Math.max(data.targets.daily.target - data.targets.daily.current, 0) ??
    data.analytics.avgBooking;
  const urgencyLabel = getUrgencyLabel(primaryAction?.slot ?? null);
  const secondaryActions = pendingActions.slice(1, 3);

  function getActionClientNames(action: DashboardPayload["actions"][number] | null) {
    if (!action || !Array.isArray(action.clientNames)) {
      return [];
    }

    return action.clientNames;
  }

  async function trackExecution(action: DashboardPayload["actions"][number]) {
    try {
      await fetch("/api/actions/track", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          briefSummary: trackedBriefSummary,
          events: [
            {
              actionId: action.id,
              eventType: "executed",
              timestamp: new Date().toISOString(),
              dataReference: action.dataReference,
              slot: action.slot,
              clientIds: action.clientIds,
              bookingIds: action.bookingIds,
            },
          ],
        }),
      });
    } catch (error) {
      console.error(error);
    }
  }

  function handleActionClick(action: DashboardPayload["actions"][number]) {
    setOptimisticCompletedActionIds((current) =>
      current.includes(action.id) ? current : [...current, action.id]
    );
    void trackExecution(action);

    if (action.executionType === "whatsapp" && action.messageLink) {
      window.open(action.messageLink, "_blank", "noopener,noreferrer");
      return;
    }

    if (action.href) {
      window.open(action.href, "_self");
    }
  }

  return (
    <section className="glass rounded-[2rem] p-6 md:p-8 shadow-premium">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <span className="inline-flex rounded-full border border-white/70 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-text-sub">
            Command Center
          </span>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-text-main md:text-4xl">
              {mode === "focus" ? "Focus Mode" : "Analyze Mode"}
            </h2>
            <p className="text-sm text-text-sub">
              {mode === "focus"
                ? "One clear move, real value, no competing signals."
                : "Expanded context for targets, trends, and system health."}
            </p>
          </div>
        </div>

        <div className="inline-flex rounded-full border border-white/80 bg-white/80 p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setMode("focus")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              mode === "focus" ? "bg-brand text-white shadow-sm" : "text-text-sub"
            }`}
          >
            Focus
          </button>
          <button
            type="button"
            onClick={() => setMode("analyze")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              mode === "analyze" ? "bg-brand text-white shadow-sm" : "text-text-sub"
            }`}
          >
            Analyze
          </button>
        </div>
      </div>

      {mode === "focus" ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-[1.75rem] border border-white/80 bg-white/90 p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                  Primary Opportunity
                </p>
                <h3 className="max-w-2xl text-2xl font-bold leading-tight text-text-main md:text-3xl">
                  {primaryAction?.title ?? data.dailyBrief.recommendedAction}
                </h3>
                <p className="max-w-2xl text-sm leading-6 text-text-sub">
                  {primaryAction?.reason ?? data.dailyBrief.biggestOpportunity}
                </p>
                {getActionClientNames(primaryAction).length > 1 ? (
                  <p className="text-xs leading-5 text-text-muted">
                    Targets: {getActionClientNames(primaryAction).join(", ")}
                  </p>
                ) : null}
              </div>

              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                  primaryAction ? priorityStyles[getPriorityBand(primaryAction.priorityScore)] : priorityStyles.medium
                }`}
              >
                {urgencyLabel}
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <FocusStat
                label="Estimated Value"
                value={`${BUSINESS.currency}${estimatedValue.toLocaleString(BUSINESS.locale)}`}
              />
              <FocusStat
                label="Why It Matters"
                value={data.dailyBrief.gapVsTarget}
              />
              <FocusStat
                label="Queue"
                value={
                  queuedActionCount > 0
                    ? `${queuedActionCount} more action${queuedActionCount === 1 ? "" : "s"} after this`
                    : "You are on the top priority"
                }
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {primaryAction ? (
                <button
                  type="button"
                  onClick={() => handleActionClick(primaryAction)}
                  className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 active:scale-[0.98]"
                >
                  {getActionLabel(primaryAction.executionType)}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setMode("analyze")}
                className="rounded-full border border-brand-light bg-white px-5 py-3 text-sm font-semibold text-brand"
              >
                Open Analyze Mode
              </button>
            </div>
          </div>

          <div className="space-y-4 rounded-[1.75rem] border border-white/80 bg-white/75 p-5 shadow-sm">
            <InfoCard
              title="Today in one line"
              copy={data.dailyBrief.performance}
            />
            <InfoCard
              title="Next after this"
              copy={
                secondaryActions[0]?.title ??
                (queuedActionCount > 0
                  ? `${queuedActionCount} actions will unlock after this one is done.`
                  : "No second action is waiting right now.")
              }
            />
            <InfoCard
              title="Momentum"
              copy={
                data.engagement.missedOpportunities.length > 0
                  ? `${data.engagement.missedOpportunities.length} missed opportunity${data.engagement.missedOpportunities.length === 1 ? "" : "ies"} still need attention.`
                  : "No missed opportunities are stacking up right now."
              }
            />
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-sm">
              <SectionTitle
                title="Data-Backed Insights"
                subtitle="Only the strongest high-priority context remains here."
              />
              <div className="mt-4 space-y-3">
                {highPriorityInsights.length > 0 ? highPriorityInsights.map((insight, index) => (
                  <div
                    key={`${insight.type}-${index}`}
                    className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm"
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
                )) : (
                  <p className="rounded-2xl border border-dashed border-brand-light p-4 text-sm text-text-sub">
                    No high-priority issues are active right now.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-sm">
              <SectionTitle
                title="Targets"
                subtitle="Live progress against your saved goals."
              />
              <div className="mt-4 space-y-4">
                {[
                  { label: "Daily", value: data.targets.daily },
                  { label: "Weekly", value: data.targets.weekly },
                  { label: "Monthly", value: data.targets.monthly },
                  { label: "Yearly", value: data.targets.yearly },
                ].map((target) => (
                  <div key={target.label} className="space-y-2">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-text-main">{target.label}</span>
                      <span className="text-text-sub">
                        {BUSINESS.currency}
                        {target.value.current.toLocaleString(BUSINESS.locale)} / {BUSINESS.currency}
                        {target.value.target.toLocaleString(BUSINESS.locale)}
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-white/90">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand via-rose-400 to-amber-300"
                        style={{ width: `${Math.min(target.value.progress, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-sm">
              <SectionTitle
                title="Missed Opportunities"
                subtitle="Real value left on the table from live data."
              />
              <div className="mt-4 space-y-3">
                {data.engagement.missedOpportunities.length > 0 ? (
                  data.engagement.missedOpportunities.slice(0, 3).map((opportunity) => (
                    <div
                      key={opportunity.id}
                      className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-amber-900">{opportunity.title}</p>
                          <p className="mt-1 text-xs leading-5 text-amber-900/75">{opportunity.reason}</p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-800">
                          {BUSINESS.currency}{opportunity.estimatedValue.toLocaleString(BUSINESS.locale)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl border border-dashed border-brand-light p-4 text-sm text-text-sub">
                    No missed opportunities are stacking up right now.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-sm">
              <SectionTitle
                title="Daily Flow"
                subtitle="How the system reads today across the full day."
              />
              <div className="mt-4 grid gap-3">
                <FlowStep title="Morning Plan" copy={data.dailyFlow.morningPlan} />
                <FlowStep title="Midday Adjustment" copy={data.dailyFlow.middayAdjustment} />
                <FlowStep title="End-of-Day Reflection" copy={data.dailyFlow.endOfDayReflection} />
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function getPriorityBand(score: number): keyof typeof priorityStyles {
  if (score >= 90) {
    return "high";
  }
  if (score >= 45) {
    return "medium";
  }
  return "low";
}

function getActionLabel(type: DashboardPayload["actions"][number]["executionType"]) {
  if (type === "whatsapp") {
    return "Open WhatsApp";
  }

  if (type === "book") {
    return "Open Booking";
  }

  return "Review Now";
}

function getUrgencyLabel(slot: string | null) {
  if (!slot) {
    return "Needs attention today";
  }

  const slotMinutes = timeToMinutes(slot);
  if (slotMinutes === null) {
    return "Today";
  }

  const nowParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Edmonton",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(new Date());

  const hour = Number(nowParts.find((part) => part.type === "hour")?.value ?? "12");
  const minute = Number(nowParts.find((part) => part.type === "minute")?.value ?? "0");
  const period = (nowParts.find((part) => part.type === "dayPeriod")?.value ?? "AM")
    .replace(/\./g, "")
    .toUpperCase();
  const nowMinutes = ((period === "AM" ? hour % 12 : (hour % 12) + 12) * 60) + minute;
  const remaining = slotMinutes - nowMinutes;

  if (remaining <= 0) {
    return "Time-sensitive now";
  }

  if (remaining < 60) {
    return `${remaining} min left`;
  }

  const hours = Math.floor(remaining / 60);
  const minutes = remaining % 60;
  return minutes === 0
    ? `${hours} hour${hours === 1 ? "" : "s"} left`
    : `${hours}h ${minutes}m left`;
}

function FocusStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/80 bg-gradient-to-br from-white to-rose-50/50 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">{label}</p>
      <p className="mt-2 text-base font-semibold leading-6 text-text-main">{value}</p>
    </div>
  );
}

function InfoCard({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">{title}</p>
      <p className="mt-2 text-sm leading-6 text-text-main">{copy}</p>
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h3 className="text-lg font-bold text-text-main">{title}</h3>
      <p className="text-sm text-text-sub">{subtitle}</p>
    </div>
  );
}

function FlowStep({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">{title}</p>
      <p className="mt-2 text-sm leading-6 text-text-main">{copy}</p>
    </div>
  );
}
