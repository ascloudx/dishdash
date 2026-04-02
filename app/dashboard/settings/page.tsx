'use client';

import { useState } from "react";
import SettingsPanel from "@/components/SettingsPanel";
import type { AppSettings } from "@/lib/settings";
import { formatBusinessTime } from "@/lib/date";

export default function DashboardSettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand/70">Control Layer</p>
        <h2 className="text-3xl font-bold tracking-tight text-text-main">Business Settings</h2>
        <p className="max-w-2xl text-sm text-text-sub">
          Update business hours, slot size, and revenue targets. These values are read by the calendar,
          backend analytics, and automation insights.
        </p>
      </div>

      <SettingsPanel onSaved={setSettings} />

      {settings ? (
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
          <div className="glass rounded-3xl p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-sub">Business Hours</p>
            <p className="mt-2 text-lg font-semibold text-text-main">
              {formatBusinessTime(`${settings.businessHours.start}:00`)} - {formatBusinessTime(`${settings.businessHours.end}:00`)}
            </p>
          </div>
          <div className="glass rounded-3xl p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-sub">Slot Duration</p>
            <p className="mt-2 text-lg font-semibold text-text-main">{settings.slotDuration} mins</p>
          </div>
          <div className="glass rounded-3xl p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-sub">Daily Target</p>
            <p className="mt-2 text-lg font-semibold text-text-main">
              {settings.currency} {settings.dailyTarget.toLocaleString("en-CA")}
            </p>
          </div>
          <div className="glass rounded-3xl p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-sub">Weekly Target</p>
            <p className="mt-2 text-lg font-semibold text-text-main">
              {settings.currency} {settings.weeklyTarget.toLocaleString("en-CA")}
            </p>
          </div>
          <div className="glass rounded-3xl p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-sub">Monthly Target</p>
            <p className="mt-2 text-lg font-semibold text-text-main">
              {settings.currency} {settings.monthlyTarget.toLocaleString("en-CA")}
            </p>
          </div>
          <div className="glass rounded-3xl p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-sub">Yearly Target</p>
            <p className="mt-2 text-lg font-semibold text-text-main">
              {settings.currency} {settings.yearlyTarget.toLocaleString("en-CA")}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
