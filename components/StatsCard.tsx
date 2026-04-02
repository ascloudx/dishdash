import { BUSINESS } from "@/config/business";

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: string;
  sub?: string;
  accent?: "rose" | "gold" | "blue" | "green";
}

const accentMap = {
  rose: {
    bg: "from-rose-50 to-pink-50",
    border: "border-rose-100",
    icon: "bg-rose-100 text-rose-600",
    value: "text-rose-700",
  },
  gold: {
    bg: "from-amber-50 to-yellow-50",
    border: "border-amber-100",
    icon: "bg-amber-100 text-amber-600",
    value: "text-amber-700",
  },
  blue: {
    bg: "from-blue-50 to-indigo-50",
    border: "border-blue-100",
    icon: "bg-blue-100 text-blue-600",
    value: "text-blue-700",
  },
  green: {
    bg: "from-emerald-50 to-teal-50",
    border: "border-emerald-100",
    icon: "bg-emerald-100 text-emerald-600",
    value: "text-emerald-700",
  },
};

export default function StatsCard({
  label,
  value,
  icon,
  sub,
  accent = "rose",
}: StatsCardProps) {
  const a = accentMap[accent];

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl border bg-gradient-to-br ${a.bg} ${a.border}
        p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md
      `}
    >
      {/* Decorative blob */}
      <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/40 blur-xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
            {label}
          </p>
          <p className={`mt-1.5 text-3xl font-bold leading-none ${a.value}`}>
            {typeof value === "number" && label.toLowerCase().includes("revenue")
              ? `${BUSINESS.currency}${value.toLocaleString(BUSINESS.locale)}`
              : value}
          </p>
          {sub && (
            <p className="mt-1.5 text-xs text-gray-500 truncate">{sub}</p>
          )}
        </div>
        <div className={`shrink-0 flex h-11 w-11 items-center justify-center rounded-xl text-xl ${a.icon}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
