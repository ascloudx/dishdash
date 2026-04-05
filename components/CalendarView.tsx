'use client';

import { useState } from "react";
import type { Booking, BookingStatus } from "@/types/booking";
import { DEFAULT_SLOTS } from "@/config/slots";
import { groupBookingsByDate, getBookingsForWeek } from "@/utils/groupBookings";
import BookingCard from "./BookingCard";
import { BUSINESS } from "@/config/business";
import type { AppSettings } from "@/lib/settings";
import {
  addDaysToDateString,
  formatBusinessDate,
  formatBusinessTime,
  getWeekStartDateString,
} from "@/lib/date";
import type { SlotMatch } from "@/lib/intelligence/matchClientsToSlots";
import { compareTimeStrings, isTimeWithinHours } from "@/lib/time";

interface CalendarViewProps {
  bookings: Booking[];
  initialDate: string;
  settings?: AppSettings;
  slots?: string[];
  slotMatches?: SlotMatch[];
  onStatusChange?: (id: string, status: BookingStatus) => void;
  onEdit?: (booking: Booking) => void;
  onDelete?: (booking: Booking) => void;
  onCreateSlot?: (date: string, time: string) => void;
  onBlockSlot?: (date: string, time: string) => void;
}

function formatDate(dateStr: string) {
  return formatBusinessDate(dateStr, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function CalendarView({
  bookings,
  initialDate,
  settings,
  slots = [],
  slotMatches = [],
  onStatusChange,
  onEdit,
  onDelete,
  onCreateSlot,
  onBlockSlot,
}: CalendarViewProps) {
  const [view, setView] = useState<"day" | "week">("day");
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [weekStart, setWeekStart] = useState(getWeekStartDateString(initialDate));

  const businessSettings = settings ?? {
    businessHours: BUSINESS.operatingHours,
    slotDuration: 60,
    currency: "CAD",
    dailyTarget: BUSINESS.dailyRevenueTarget,
    weeklyTarget: BUSINESS.dailyRevenueTarget * 6,
    monthlyTarget: BUSINESS.dailyRevenueTarget * 24,
    yearlyTarget: BUSINESS.dailyRevenueTarget * 288,
  };
  const grouped = groupBookingsByDate(bookings.filter((booking) => booking.status !== "cancelled"));
  const weekData = getBookingsForWeek(bookings, weekStart);
  const weekDates = Object.keys(weekData).sort();
  const dayBookings = grouped[selectedDate] || [];
  const visibleSlots = (slots.length > 0 ? slots : [...DEFAULT_SLOTS])
    .filter((slot) =>
      isTimeWithinHours(
        slot,
        businessSettings.businessHours.start,
        businessSettings.businessHours.end
      )
    )
    .sort(compareTimeStrings);
  const slotMatchMap = new Map(slotMatches.map((match) => [match.slot, match]));
  const timelineSlots = visibleSlots.map((slot) => ({
    time: slot,
    formatted: formatBusinessTime(slot),
    match: slotMatchMap.get(slot) ?? null,
    bookings: dayBookings
      .filter((booking) => booking.time === slot)
      .sort((left, right) => left.datetime.localeCompare(right.datetime)),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="inline-flex rounded-full border border-rose-100 bg-rose-50 p-0.5">
          <button
            onClick={() => setView("day")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
              view === "day" ? "bg-[#C75C6E] text-white shadow-sm" : "text-gray-500 hover:text-[#C75C6E]"
            }`}
          >
            Day View
          </button>
          <button
            onClick={() => setView("week")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
              view === "week" ? "bg-[#C75C6E] text-white shadow-sm" : "text-gray-500 hover:text-[#C75C6E]"
            }`}
          >
            Week View
          </button>
        </div>
      </div>

      {view === "day" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-rose-100 bg-rose-50/50 p-3">
            <button
              onClick={() => setSelectedDate(addDaysToDateString(selectedDate, -1))}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm hover:text-[#C75C6E] transition-colors"
            >
              ‹
            </button>
            <div className="text-center">
              <p className="font-semibold text-gray-800">{formatDate(selectedDate)}</p>
              <p className="text-xs text-gray-400">{dayBookings.length} appointment{dayBookings.length !== 1 ? "s" : ""}</p>
            </div>
            <button
              onClick={() => setSelectedDate(addDaysToDateString(selectedDate, 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm hover:text-[#C75C6E] transition-colors"
            >
              ›
            </button>
          </div>

          <div className="space-y-3">
            {timelineSlots.map((slot) => (
              <div
                key={slot.time}
                className={`rounded-2xl border p-3 transition-all ${
                  slot.bookings.length > 0 ? "border-rose-100 bg-white shadow-sm" : "border-dashed border-rose-100 bg-rose-50/30"
                } ${slot.bookings.length === 0 && onCreateSlot ? "cursor-pointer hover:border-brand/40 hover:bg-rose-50/60" : ""}`}
                onClick={
                  slot.bookings.length === 0 && onCreateSlot
                    ? () => onCreateSlot(selectedDate, slot.time)
                    : undefined
                }
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-sub">{slot.formatted}</p>
                  {slot.bookings.length === 0 ? (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      Gap detected
                    </span>
                  ) : (
                    <span className="rounded-full bg-brand-light px-2 py-0.5 text-[10px] font-semibold text-brand">
                      {slot.bookings.length} booked
                    </span>
                  )}
                </div>

                {slot.bookings.length > 0 ? (
                  <div className="space-y-3">
                    {slot.bookings.map((booking) => (
                      booking.type === "blocked" ? (
                        <div
                          key={booking.id}
                          className="rounded-2xl border border-slate-200 bg-slate-100/80 p-4 text-sm text-slate-700"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold">Blocked Slot</p>
                              <p className="text-xs text-slate-500">
                                {booking.notes || "Reserved and unavailable for booking."}
                              </p>
                            </div>
                            {onDelete ? (
                              <button
                                type="button"
                                onClick={() => onDelete(booking)}
                                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600"
                              >
                                Unblock
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <BookingCard
                          key={booking.id}
                          booking={booking}
                          onStatusChange={onStatusChange}
                          onEdit={onEdit}
                          onDelete={onDelete}
                        />
                      )
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-medium text-gray-500">No booking scheduled in this business-hour slot.</p>
                      <div className="flex flex-wrap gap-2">
                        {onCreateSlot ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onCreateSlot(selectedDate, slot.time);
                            }}
                            className="rounded-full bg-brand px-3.5 py-2 text-xs font-semibold text-white"
                          >
                            Add Booking
                          </button>
                        ) : null}
                        {onBlockSlot ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onBlockSlot(selectedDate, slot.time);
                            }}
                            className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600"
                          >
                            Block Slot
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {slot.match?.candidates[0] ? (
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                          Best Fit
                        </p>
                        <p className="mt-1 text-sm font-semibold text-emerald-900">
                          {slot.match.candidates[0].name}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-emerald-900/80">
                          {slot.match.candidates[0].reason}
                        </p>
                        {slot.match.candidates.length > 1 ? (
                          <p className="mt-2 text-[11px] text-emerald-800/70">
                            {slot.match.candidates.length - 1} more client{slot.match.candidates.length - 1 === 1 ? "" : "s"} also fit this slot.
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-rose-100 bg-rose-50/50 p-3">
            <button
              onClick={() => setWeekStart(addDaysToDateString(weekStart, -7))}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm hover:text-[#C75C6E] transition-colors"
            >
              ‹
            </button>
            <p className="text-sm font-semibold text-gray-700">
              {formatDate(weekStart)} — {formatDate(addDaysToDateString(weekStart, 6))}
            </p>
            <button
              onClick={() => setWeekStart(addDaysToDateString(weekStart, 7))}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm hover:text-[#C75C6E] transition-colors"
            >
              ›
            </button>
          </div>

          <div className="space-y-3">
            {weekDates.map((date) => {
              const dayBks = weekData[date] || [];
              return (
                <div key={date} className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
                  <div className="flex items-center justify-between border-b border-gray-50 bg-gray-50/70 px-4 py-2.5">
                    <span className="text-sm font-semibold text-gray-700">{formatDate(date)}</span>
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-[#C75C6E]">
                      {dayBks.length}
                    </span>
                  </div>
                  {dayBks.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-400 italic">No appointments</p>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {dayBks.map((booking) => (
                        <div key={booking.id} className="flex items-center justify-between gap-3 px-4 py-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{booking.name}</p>
                            <p className="text-xs text-gray-400">{booking.serviceName}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-xs font-mono text-gray-500">{formatBusinessTime(booking.time)}</p>
                            <p className="text-xs font-semibold text-[#C75C6E]">
                              {BUSINESS.currency}{booking.price.toLocaleString(BUSINESS.locale)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
