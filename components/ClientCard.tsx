import Link from "next/link";
import type { Client, ClientTag } from "@/types/client";
import { BUSINESS } from "@/config/business";

interface ClientCardProps {
  client: Client;
}

const tagStyles: Record<ClientTag, string> = {
  VIP: "bg-amber-50 text-amber-700 border-amber-200",
  Regular: "bg-indigo-50 text-indigo-700 border-indigo-200",
  New: "bg-rose-50 text-[#C75C6E] border-rose-100",
  "At Risk": "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const tagIcons: Record<ClientTag, string> = {
  VIP: "👑",
  Regular: "⭐",
  New: "🌸",
  "At Risk": "⚠️",
};

const lifecycleStyles = {
  New: "bg-rose-50 text-brand",
  Active: "bg-sky-soft text-blue-700",
  Loyal: "bg-butter-soft text-amber-700",
  "At Risk": "bg-mint-soft text-emerald-700",
  Lost: "bg-gray-100 text-gray-600",
} as const;

export default function ClientCard({ client }: ClientCardProps) {
  return (
    <Link href={`/clients/${encodeURIComponent(client.phoneNormalized)}`} className="group relative block overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.995]">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        {/* Avatar */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#C75C6E] to-[#E8AEB7] text-white text-sm font-bold shadow-sm">
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{client.name}</p>
            <p className="text-xs text-gray-400">{client.phone}</p>
          </div>
        </div>

        {/* Tag badge */}
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tagStyles[client.tag]}`}
        >
          {tagIcons[client.tag]} {client.tag}
        </span>
      </div>

      {/* Stats row */}
      <div className="mt-4 grid grid-cols-3 divide-x divide-gray-100 rounded-xl bg-gray-50 text-center">
        <div className="py-2.5 px-2">
          <p className="text-lg font-bold text-gray-800">{client.totalVisits}</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Visits</p>
        </div>
        <div className="py-2.5 px-2">
          <p className="text-lg font-bold text-[#C75C6E] whitespace-nowrap">
            {BUSINESS.currency}{client.totalSpent.toLocaleString(BUSINESS.locale)}
          </p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Spent</p>
        </div>
        <div className="py-2.5 px-2">
          <p className="text-lg font-bold text-gray-600 text-sm">
            {new Intl.DateTimeFormat(BUSINESS.locale, {
              timeZone: BUSINESS.timezone,
              day: "numeric",
              month: "short",
            }).format(new Date(`${client.lastVisit}T12:00:00Z`))}
          </p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Last</p>
        </div>
      </div>

      {/* Notes tags */}
      {client.tags.length > 0 && (
        <p className="mt-3 text-sm text-gray-400">
          {client.tags.join("  ")}
        </p>
      )}
      {client.nextActionHint ? (
        <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Next Move</p>
          <p className="mt-1 text-xs leading-5 text-emerald-900">{client.nextActionHint}</p>
        </div>
      ) : null}
      <div className="mt-3 flex items-center justify-between text-xs text-text-sub">
        <span>Score {Math.round(client.priorityScore ?? client.score)}</span>
        <span className={`rounded-full px-2 py-1 font-semibold ${lifecycleStyles[client.lifecycle]}`}>{client.lifecycle}</span>
      </div>
    </Link>
  );
}
