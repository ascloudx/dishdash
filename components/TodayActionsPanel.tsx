"use client";

import { useEffect, useState } from "react";

interface ActionItem {
  key: string;
  type: "reminder_24h" | "reminder_2h" | "reactivation";
  name: string;
  phone: string;
  service: string;
  label: string;
  whatsappLink: string | null;
  helper: string;
}

const accentMap = {
  reminder_24h: "border-amber-100 bg-amber-50/70 text-amber-700",
  reminder_2h: "border-rose-100 bg-rose-50/70 text-rose-700",
  reactivation: "border-blue-100 bg-blue-50/70 text-blue-700",
};

export default function TodayActionsPanel() {
  const [actions, setActions] = useState<ActionItem[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/actions/today", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load actions");
        }

        const payload = (await response.json()) as ActionItem[];
        if (active) {
          setActions(payload);
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
    <div className="glass rounded-3xl p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-text-main">Today&apos;s Actions</h3>
          <p className="text-sm text-text-sub">
            Tomorrow reminders, urgent visits, and overdue clients with one-tap outreach.
          </p>
        </div>
        <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand">
          {actions.length} live
        </span>
      </div>

      {actions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-light p-8 text-center">
          <p className="text-3xl">✨</p>
          <p className="mt-2 text-sm font-medium text-text-main">No urgent actions right now</p>
          <p className="text-xs text-text-sub">This panel will populate automatically as bookings change.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {actions.map((action, index) => (
            <div
              key={`${action.key}-${index}`}
              className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${accentMap[action.type]}`}>
                    {action.label}
                  </span>
                  <p className="font-semibold text-text-main">{action.name}</p>
                  <p className="text-xs text-text-sub">{action.service}</p>
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
          ))}
        </div>
      )}
    </div>
  );
}
