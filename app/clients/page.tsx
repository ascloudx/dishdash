'use client';

import { useState, useEffect, useCallback } from "react";
import ClientCard from "@/components/ClientCard";
import type { Client } from "@/types/client";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<"" | "VIP" | "Regular" | "New">("");
  const [loading, setLoading] = useState(true);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/clients");
      if (!res.ok) {
        throw new Error("Request failed");
      }
      const data: Client[] = await res.json();
      setClients(data);
    } catch (e) {
      console.error(e);
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const filtered = clients.filter((client) => {
    const matchesTag = !tagFilter || client.tag === tagFilter;
    const matchesSearch = !search.trim() ||
      client.name.toLowerCase().includes(search.toLowerCase()) ||
      client.phone.includes(search) ||
      client.phoneNormalized.includes(search);

    return matchesTag && matchesSearch;
  });

  const vipCount = clients.filter((c) => c.tag === "VIP").length;
  const regularCount = clients.filter((c) => c.tag === "Regular").length;
  const newCount = clients.filter((c) => c.tag === "New").length;
  const topClients = [...filtered].sort((a, b) => b.score - a.score).slice(0, 6);
  const atRiskClients = filtered.filter((client) => client.isInactive).sort((a, b) => b.score - a.score);
  const newClients = filtered.filter((client) => client.tag === "New").sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h2 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-text-main">
          Client Directory <span>👥</span>
        </h2>
        <p className="text-text-sub mt-1">
          {clients.length} clients · {vipCount} VIP · {regularCount} Regular · {newCount} New
        </p>
      </div>

      {/* Tag filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "All", value: "" },
          { label: "👑 VIP", value: "vip" },
          { label: "⭐ Regular", value: "regular" },
          { label: "🌸 New", value: "new" },
        ].map((f) => (
          <button
            key={f.label}
            onClick={() =>
              setTagFilter(
                f.value === ""
                  ? ""
                  : f.value === "vip"
                    ? "VIP"
                    : f.value === "regular"
                      ? "Regular"
                      : "New"
              )
            }
            className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-all duration-200 ${
              (f.value === "" && tagFilter === "") ||
              (f.value === "vip" && tagFilter === "VIP") ||
              (f.value === "regular" && tagFilter === "Regular") ||
              (f.value === "new" && tagFilter === "New")
                ? "bg-brand text-white border-brand shadow-sm"
                : "bg-white text-text-sub border-gray-200 hover:border-brand/40 hover:text-brand"
            }`}
          >
            {f.label}
          </button>
        ))}

        {/* Free-text search */}
        <div className="relative flex-1 min-w-48">
          <span className="absolute inset-y-0 left-3.5 flex items-center text-text-muted text-sm pointer-events-none">🔍</span>
          <input
            type="text"
            placeholder="Search by name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-full border border-gray-200 bg-white text-text-main placeholder-text-muted text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-3xl p-14 text-center border-2 border-dashed border-brand-light">
          <div className="text-5xl mb-4">👤</div>
          <h4 className="font-bold text-lg text-text-main">No clients found</h4>
          <p className="text-text-sub text-sm mt-1">Try a different search or clear the filter.</p>
        </div>
      ) : (
        <div className="space-y-10">
          <ClientSection title="Top Clients" clients={topClients} />
          <ClientSection title="At Risk Clients" clients={atRiskClients} />
          <ClientSection title="New Clients" clients={newClients} />
        </div>
      )}
    </div>
  );
}

function ClientSection({ title, clients }: { title: string; clients: Client[] }) {
  if (clients.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-text-main">{title}</h3>
        <span className="text-xs font-semibold uppercase tracking-wide text-text-sub">{clients.length} clients</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map((client, index) => (
          <div
            key={`${title}-${client.phoneNormalized}`}
            className="animate-fade-in"
            style={{ animationDelay: `${index * 40}ms` }}
          >
            <ClientCard client={client} />
          </div>
        ))}
      </div>
    </section>
  );
}
