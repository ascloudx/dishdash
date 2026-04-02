'use client';

import { useEffect, useState } from "react";
import type { AppSettings } from "@/lib/settings";
import { formatBusinessTime } from "@/lib/date";

interface SettingsPanelProps {
  onSaved?: (settings: AppSettings) => void;
}

const defaultSettings: AppSettings = {
  businessHours: {
    start: 9,
    end: 20,
  },
  slotDuration: 60,
  currency: "CAD",
  dailyTarget: 250,
  weeklyTarget: 1500,
  monthlyTarget: 6000,
  yearlyTarget: 72000,
};

export default function SettingsPanel({ onSaved }: SettingsPanelProps) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const hourOptions = Array.from({ length: 24 }, (_, hour) => hour);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/settings", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load settings");
        }
        const payload = (await response.json()) as AppSettings;
        if (active) {
          setSettings(payload);
          onSaved?.(payload);
        }
      } catch (error) {
        console.error(error);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [onSaved]);

  async function saveSettings() {
    setSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      const payload = (await response.json()) as AppSettings;
      setSettings(payload);
      onSaved?.(payload);
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glass rounded-3xl p-6 space-y-4">
      <div>
        <h3 className="text-xl font-bold text-text-main">Settings</h3>
        <p className="text-sm text-text-sub">
          Business hours, slot size, and revenue targets drive the calendar and live decision engine.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label>
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-sub">Start Hour</span>
          <select
            value={settings.businessHours.start}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                businessHours: {
                  ...current.businessHours,
                  start: Number(event.target.value),
                },
              }))
            }
            className="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-text-main"
          >
            {hourOptions.map((hour) => (
              <option key={hour} value={hour}>
                {formatBusinessTime(`${String(hour).padStart(2, "0")}:00`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-sub">End Hour</span>
          <select
            value={settings.businessHours.end}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                businessHours: {
                  ...current.businessHours,
                  end: Number(event.target.value),
                },
              }))
            }
            className="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-text-main"
          >
            {Array.from({ length: 24 }, (_, index) => index + 1).map((hour) => (
              <option key={hour} value={hour}>
                {formatBusinessTime(`${String(hour % 24).padStart(2, "0")}:00`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-sub">Slot Duration</span>
          <input
            type="number"
            min="30"
            step="30"
            value={settings.slotDuration}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                slotDuration: Number(event.target.value),
              }))
            }
            className="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-text-main"
          />
        </label>
        <label>
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-sub">Daily Target</span>
          <input
            type="number"
            min="0"
            step="5"
            value={settings.dailyTarget}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                dailyTarget: Number(event.target.value),
              }))
            }
            className="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-text-main"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <label>
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-sub">Weekly Target</span>
          <input
            type="number"
            min="0"
            step="10"
            value={settings.weeklyTarget}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                weeklyTarget: Number(event.target.value),
              }))
            }
            className="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-text-main"
          />
        </label>
        <label>
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-sub">Monthly Target</span>
          <input
            type="number"
            min="0"
            step="25"
            value={settings.monthlyTarget}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                monthlyTarget: Number(event.target.value),
              }))
            }
            className="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-text-main"
          />
        </label>
        <label>
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-sub">Yearly Target</span>
          <input
            type="number"
            min="0"
            step="100"
            value={settings.yearlyTarget}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                yearlyTarget: Number(event.target.value),
              }))
            }
            className="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-text-main"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="rounded-2xl bg-white/70 px-4 py-3 text-sm text-text-sub">
          Currency is locked to <span className="font-semibold text-text-main">{settings.currency}</span> for this business.
        </div>
        <button
          type="button"
          onClick={saveSettings}
          disabled={saving}
          className="rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
