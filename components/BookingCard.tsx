'use client';

import type { Booking, BookingStatus } from "@/types/booking";
import { formatBusinessTime } from "@/lib/date";
import { buildReminderMessage, generateWhatsAppLink } from "@/lib/whatsapp";
import { extractTags } from "@/utils/extractTags";
import { BUSINESS } from "@/config/business";

interface BookingCardProps {
  booking: Booking;
  onStatusChange?: (id: string, status: BookingStatus) => void;
  onEdit?: (booking: Booking) => void;
  onDelete?: (booking: Booking) => void;
}

export default function BookingCard({ booking, onStatusChange, onEdit, onDelete }: BookingCardProps) {
  const tags = extractTags(booking.tags);
  const whatsappLink = generateWhatsAppLink(
    booking.phone,
    buildReminderMessage(booking.name, formatBusinessTime(booking.time))
  );

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-rose-200 active:scale-[0.995] ${
        booking.status === "upcoming" ? "border-rose-200 ring-1 ring-rose-100" : "border-rose-100"
      }`}
    >
      <div className="absolute left-0 top-0 h-full w-1 rounded-l-2xl bg-gradient-to-b from-[#C75C6E] to-[#E8AEB7]" />

      <div className="pl-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-semibold text-gray-900">{booking.name}</p>
              {tags.length > 0 && (
                <span className="flex flex-wrap gap-1 text-[11px] text-text-sub">
                  {tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-rose-50 px-2 py-0.5">
                      {tag}
                    </span>
                  ))}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{booking.phone}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-lg font-bold text-[#C75C6E] whitespace-nowrap">
              {BUSINESS.currency}{booking.price.toLocaleString(BUSINESS.locale)}
            </p>
            <p className="text-xs font-mono text-gray-400">{formatBusinessTime(booking.time)}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-[#C75C6E] border border-rose-100">
            {booking.serviceName}
          </span>
          <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium border-slate-200 bg-slate-50 text-slate-700">
            {booking.source}
          </span>
          <span className={statusClassName(booking.status)}>
            {booking.status}
          </span>
          {!booking.phoneValid && (
            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
              phone check
            </span>
          )}
        </div>

        {booking.notes && (
          <p className="mt-2.5 text-xs text-gray-500 leading-relaxed line-clamp-2">
            {booking.notes}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={whatsappLink}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-brand px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-transform duration-200 active:scale-[0.98]"
          >
            Message
          </a>
          {onEdit ? (
            <button
              type="button"
              onClick={() => onEdit(booking)}
              className="rounded-full border border-rose-100 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-brand transition-transform duration-200 active:scale-[0.98]"
            >
              Edit
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              onClick={() => onDelete(booking)}
              className="rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-text-sub transition-transform duration-200 active:scale-[0.98]"
            >
              Delete
            </button>
          ) : null}
          {onStatusChange ? (
            <button
              type="button"
              onClick={() =>
                onStatusChange(
                  booking.id,
                  booking.status === "completed" ? "upcoming" : "completed"
                )
              }
              className="whitespace-nowrap rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-text-sub transition-transform duration-200 active:scale-[0.98]"
            >
              Mark as {booking.status === "completed" ? "upcoming" : "completed"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function statusClassName(status: BookingStatus) {
  if (status === "completed") {
    return "inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700";
  }

  if (status === "cancelled") {
    return "inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600";
  }

  return "inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700";
}
