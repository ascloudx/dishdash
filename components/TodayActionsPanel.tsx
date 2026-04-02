"use client";

import { useEffect, useState } from "react";
import type { AutomationAction, AutomationInsight } from "@/lib/automation/types";

interface AutomationResultsPayload {
  generatedAt: string | null;
  reminders: AutomationAction[];
  reactivations: AutomationAction[];
  insights: AutomationInsight[];
}

const actionAccentMap = {
  reminder_24h: "border-amber-100 bg-amber-50/70 text-amber-700",
  reminder_2h: "border-rose-100 bg-rose-50/70 text-rose-700",
  reactivation: "border-blue-100 bg-blue-50/70 text-blue-700",
  manual_followup: "border-slate-100 bg-slate-50/70 text-slate-700",
} as const;

const insightAccentMap = {
  high: "border-rose-100 bg-rose-50/70 text-rose-700",
  medium: "border-amber-100 bg-amber-50/70 text-amber-700",
  low: "border-blue-100 bg-blue-50/70 text-blue-700",
} as const;

export default function TodayActionsPanel() {
  const [results, setResults] = useState<AutomationResultsPayload>({
    generatedAt: null,
    reminders: [],
    reactivations: [],
    insights: [],
  });

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/automation/results", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load automation results");
        }

        const payload = (await response.json()) as AutomationResultsPayload;
        if (active) {
          setResults(payload);
        }
      } catch (error) {
        console.error(error);
      }
    }

    load();
    const interval = setInterval(load, 30000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <Panel
        title="Reminders"
        subtitle="Stored reminder outputs from the automation cycle."
        count={results.reminders.length}
        emptyTitle="No reminders stored"
        emptyBody="Run the automation cycle to populate 24h and 2h reminders."
      >
        {results.reminders.map((action) => (
          <ActionCard key={action.key} action={action} />
        ))}
      </Panel>

      <Panel
        title="Reactivations"
        subtitle="Stored client recovery actions from the backend."
        count={results.reactivations.length}
        emptyTitle="No reactivations stored"
        emptyBody="Eligible inactive clients will appear here after the automation cycle runs."
      >
        {results.reactivations.map((action) => (
          <ActionCard key={action.key} action={action} />
        ))}
      </Panel>

      <Panel
        title="Insights"
        subtitle="Backend-generated automation insights."
        count={results.insights.length}
        emptyTitle="No insights stored"
        emptyBody="Insights will appear here after automation results are written to Redis."
      >
        {results.insights.map((insight, index) => (
          <div
            key={`${insight.type}-${index}`}
            className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${insightAccentMap[insight.priority]}`}
                >
                  {insight.priority}
                </span>
                <p className="text-sm text-text-main">{insight.message}</p>
              </div>
            </div>
          </div>
        ))}
      </Panel>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  count,
  emptyTitle,
  emptyBody,
  children,
}: {
  title: string;
  subtitle: string;
  count: number;
  emptyTitle: string;
  emptyBody: string;
  children: React.ReactNode;
}) {
  const hasContent = count > 0;

  return (
    <div className="glass rounded-3xl p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-text-main">{title}</h3>
          <p className="text-sm text-text-sub">{subtitle}</p>
        </div>
        <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand">
          {count}
        </span>
      </div>

      {hasContent ? (
        <div className="space-y-3">{children}</div>
      ) : (
        <div className="rounded-2xl border border-dashed border-brand-light p-8 text-center">
          <p className="text-3xl">✨</p>
          <p className="mt-2 text-sm font-medium text-text-main">{emptyTitle}</p>
          <p className="text-xs text-text-sub">{emptyBody}</p>
        </div>
      )}
    </div>
  );
}

function ActionCard({ action }: { action: AutomationAction }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <span
            className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${actionAccentMap[action.type]}`}
          >
            {action.type}
          </span>
          <p className="font-semibold text-text-main">{action.name}</p>
          <p className="text-xs text-text-sub">{action.serviceName ?? "Follow-up"}</p>
          <p className="text-xs text-text-muted">{action.helper}</p>
        </div>
        {action.whatsappLink ? (
          <a
            href={action.whatsappLink}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white shadow-sm transition-transform duration-200 active:scale-[0.98]"
          >
            Send WhatsApp
          </a>
        ) : (
          <span className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-500">
            Invalid phone
          </span>
        )}
      </div>
    </div>
  );
}
