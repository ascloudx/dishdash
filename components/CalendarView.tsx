'use client';

import { useState } from "react";
import type { Booking, BookingStatus } from "@/types/booking";
import { groupBookingsByDate, getBookingsForWeek } from "@/utils/groupBookings";
import BookingCard from "./BookingCard";
import { BUSINESS } from "@/config/business";
import {
  addDaysToDateString,
  formatBusinessDate,
  formatBusinessTime,
  getWeekStartDateString,
} from "@/lib/date";

interface CalendarViewProps {
  bookings: Booking[];
  initialDate: string;
  onStatusChange?: (id: string, status: BookingStatus) => void;
  onEdit?: (booking: Booking) => void;
  onDelete?: (booking: Booking) => void;
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
  onStatusChange,
  onEdit,
  onDelete,
}: CalendarViewProps) {
  const [view, setView] = useState<"day" | "week">("day");
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [weekStart, setWeekStart] = useState(getWeekStartDateString(initialDate));

  const grouped = groupBookingsByDate(bookings.filter((booking) => booking.status !== "cancelled"));
  const weekData = getBookingsForWeek(bookings, weekStart);
  const weekDates = Object.keys(weekData).sort();
  const dayBookings = grouped[selectedDate] || [];
  const timelineSlots = Array.from(
    { length: BUSINESS.operatingHours.end - BUSINESS.operatingHours.start + 1 },
    (_, index) => {
      const hour = BUSINESS.operatingHours.start + index;
      const time = `${String(hour).padStart(2, "0")}:00`;
      return {
        time,
        formatted: formatBusinessTime(time),
        bookings: dayBookings.filter((booking) => booking.time.startsWith(`${String(hour).padStart(2, "0")}:`)),
      };
    }
  );

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
                }`}
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
                      <BookingCard
                        key={booking.id}
                        booking={booking}
                        onStatusChange={onStatusChange}
                        onEdit={onEdit}
                        onDelete={onDelete}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-medium text-gray-500">No booking scheduled in this business-hour slot.</p>
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
