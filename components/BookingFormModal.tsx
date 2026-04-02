'use client';

import { useEffect, useState } from "react";
import type { Booking } from "@/types/booking";
import type { Service } from "@/config/services";
import { formatBusinessTime } from "@/lib/date";
import { normalizeTimeInput } from "@/lib/time";

interface BookingFormModalProps {
  open: boolean;
  services: Service[];
  slots: string[];
  booking?: Booking | null;
  mode: "create" | "edit";
  defaultDate?: string;
  defaultTime?: string;
  onClose: () => void;
  onSaved: (booking: Booking) => void;
}

interface BookingFormState {
  name: string;
  phone: string;
  serviceId: string;
  price: string;
  date: string;
  time: string;
  customTime: string;
  notes: string;
}

const initialState: BookingFormState = {
  name: "",
  phone: "",
  serviceId: "",
  price: "0",
  date: "",
  time: "",
  customTime: "",
  notes: "",
};

export default function BookingFormModal({
  open,
  services,
  slots,
  booking,
  mode,
  defaultDate,
  defaultTime,
  onClose,
  onSaved,
}: BookingFormModalProps) {
  const [form, setForm] = useState<BookingFormState>(initialState);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (booking) {
      setForm({
        name: booking.name,
        phone: booking.phone,
        serviceId: booking.serviceId,
        price: String(booking.price),
        date: booking.date,
        time: slots.includes(booking.time) ? booking.time : "",
        customTime: slots.includes(booking.time) ? "" : booking.time,
        notes: booking.notes,
      });
    } else {
      setForm({
        ...initialState,
        date: defaultDate ?? "",
        time: defaultTime && slots.includes(defaultTime) ? defaultTime : "",
        customTime: defaultTime && !slots.includes(defaultTime) ? defaultTime : "",
      });
    }

    setError(null);
  }, [booking, defaultDate, defaultTime, open, slots]);

  useEffect(() => {
    const service = services.find((entry) => entry.id === form.serviceId);
    if (!service) {
      return;
    }

    setForm((current) => {
      if (booking && current.serviceId === booking.serviceId) {
        return current;
      }

      return {
        ...current,
        price: String(service.price),
      };
    });
  }, [booking, form.serviceId, services]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const normalizedTime = normalizeTimeInput(form.customTime || form.time);
      if (!normalizedTime) {
        throw new Error("Select a valid time or enter a custom time like 11:00 AM.");
      }

      const payload =
        mode === "create"
          ? {
              name: form.name,
              phone: form.phone,
              serviceId: form.serviceId,
              date: form.date,
              time: normalizedTime,
              notes: form.notes,
              source: "manual" as const,
            }
          : {
              id: booking?.id,
              updates: {
                name: form.name,
                phone: form.phone,
                serviceId: form.serviceId,
                price: Number(form.price),
                date: form.date,
                time: normalizedTime,
                notes: form.notes,
              },
            };

      const response = await fetch(mode === "create" ? "/api/bookings/create" : `/api/bookings/${booking?.id}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as Booking | { error: string };
      if (!response.ok || "error" in result) {
        throw new Error("error" in result ? result.error : "Failed to save booking.");
      }

      onSaved(result);
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to save booking.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm">
      <div className="soft-panel w-full max-w-2xl rounded-[2rem] border border-white/80 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-sub">
              {mode === "create" ? "Manual Booking" : "Edit Booking"}
            </p>
            <h3 className="mt-1 text-2xl font-semibold text-text-main">
              {mode === "create" ? "Add a booking" : booking?.name ?? "Edit appointment"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/80 bg-white/80 px-3 py-1.5 text-sm font-semibold text-text-sub"
          >
            Close
          </button>
        </div>

        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <Field label="Name">
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-text-main outline-none focus:border-brand/40"
              required
            />
          </Field>

          <Field label="Phone">
            <input
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              className="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-text-main outline-none focus:border-brand/40"
              required
            />
          </Field>

          <Field label="Service">
            <select
              value={form.serviceId}
              onChange={(event) => setForm((current) => ({ ...current, serviceId: event.target.value }))}
              className="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-text-main outline-none focus:border-brand/40"
              required
            >
              <option value="">Select a service</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Price">
            <input
              type="number"
              min="0"
              value={form.price}
              onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
              disabled={mode === "create"}
              className="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-text-main outline-none focus:border-brand/40"
              required
            />
            {mode === "create" ? (
              <p className="mt-1 text-xs text-text-sub">Price is pulled automatically from the selected service.</p>
            ) : null}
          </Field>

          <Field label="Date">
            <input
              type="date"
              value={form.date}
              onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
              className="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-text-main outline-none focus:border-brand/40"
              required
            />
          </Field>

          <Field label="Time">
            <select
              value={form.time}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  time: normalizeTimeInput(event.target.value) ?? event.target.value,
                  customTime: "",
                }))
              }
              className="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-text-main outline-none focus:border-brand/40"
            >
              <option value="">Select a slot</option>
              {slots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
            {form.time ? <p className="mt-1 text-xs text-text-sub">{formatBusinessTime(form.time)}</p> : null}
          </Field>

          <Field label="Custom Time">
            <input
              type="text"
              value={form.customTime}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  customTime: event.target.value,
                }))
              }
              placeholder="e.g. 11:00 AM"
              className="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-text-main outline-none focus:border-brand/40"
            />
            <p className="mt-1 text-xs text-text-sub">
              Use this only when the booking is outside the current slot list.
            </p>
          </Field>

          <Field label="Notes" className="md:col-span-2">
            <textarea
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              className="min-h-28 w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-text-main outline-none focus:border-brand/40"
            />
          </Field>

          {error ? (
            <div className="md:col-span-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="md:col-span-2 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/80 bg-white/80 px-4 py-2.5 text-sm font-semibold text-text-sub"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Saving..." : mode === "create" ? "Create Booking" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-sub">
        {label}
      </span>
      {children}
    </label>
  );
}
