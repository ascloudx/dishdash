'use client';

import { useEffect, useState } from "react";
import type { CommandCenterAction, CommandCenterOutput } from "@/lib/commandCenter";

const toneMap = {
  urgent: "border-rose-100 bg-rose-50/70 text-rose-700",
  today: "border-amber-100 bg-amber-50/70 text-amber-700",
  optimize: "border-blue-100 bg-blue-50/70 text-blue-700",
} as const;

const actionLabelMap = {
  message: "Open Action",
  booking: "Open Schedule",
  review: "Review",
} as const;

const fallbackResults: CommandCenterOutput = {
  urgent: [],
  today: [],
  optimize: [],
};

export default function CommandCenterPanel() {
  const [results, setResults] = useState<CommandCenterOutput>(fallbackResults);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/command-center", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load command center");
        }

        const payload = (await response.json()) as CommandCenterOutput;
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
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand/70">Command Center</p>
        <h3 className="text-2xl font-bold text-text-main">What to do next</h3>
        <p className="text-sm text-text-sub">
          Prioritized actions generated from live bookings, schedule gaps, reminders, and revenue targets.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <ActionColumn title="Urgent" actions={results.urgent} />
        <ActionColumn title="Today" actions={results.today} />
        <ActionColumn title="Optimize" actions={results.optimize} />
      </div>
    </section>
  );
}

function ActionColumn({
  title,
  actions,
}: {
  title: string;
  actions: CommandCenterAction[];
}) {
  return (
    <div className="glass rounded-3xl p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-lg font-bold text-text-main">{title}</h4>
        <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand">
          {actions.length}
        </span>
      </div>

      <div className="space-y-3">
        {actions.map((action) => (
          <div key={action.id} className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${toneMap[action.type]}`}
                  >
                    {action.source}
                  </span>
                  <p className="mt-2 font-semibold text-text-main">{action.title}</p>
                  <p className="mt-1 text-sm text-text-sub">{action.description}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                  {action.priorityScore}
                </span>
              </div>

              {action.href ? (
                <a
                  href={action.href}
                  className="inline-flex rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white"
                >
                  {actionLabelMap[action.actionType]}
                </a>
              ) : (
                <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-500">
                  Review only
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
