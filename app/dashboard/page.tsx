'use client';

import { useState, useEffect, useCallback } from "react";
import StatsCard from "@/components/StatsCard";
import BookingCard from "@/components/BookingCard";
import OwnerFocusPanel from "@/components/OwnerFocusPanel";
import TodayActionsPanel from "@/components/TodayActionsPanel";
import type { Booking } from "@/types/booking";
import {
  calculateTotalRevenue,
  getMostPopularService,
  getTodayBookings,
  getWeekBookings,
} from "@/utils/calculateRevenue";
import { getTodayDateString } from "@/lib/date";

export default function DashboardPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const today = getTodayDateString();

  const fetchBookings = useCallback(async () => {
    try {
      const res = await fetch("/api/bookings/list", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Request failed");
      }
      const data: Booking[] = await res.json();
      setBookings(data);
    } catch (error) {
      console.error("Failed to fetch bookings", error);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateBookingStatus = useCallback(async (id: string, status: Booking["status"]) => {
    try {
      const response = await fetch("/api/bookings/update", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, updates: { status } }),
      });

      if (!response.ok) {
        throw new Error("Failed to update booking");
      }

      const updated = (await response.json()) as Booking;
      setBookings((current) =>
        current.map((booking) => (booking.id === updated.id ? updated : booking))
      );
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
    const interval = setInterval(fetchBookings, 15000);
    return () => clearInterval(interval);
  }, [fetchBookings]);

  const todayBookings = getTodayBookings(bookings, today).sort((a, b) => a.time.localeCompare(b.time));
  const weekBookings = getWeekBookings(bookings, today);
  const todayRevenue = calculateTotalRevenue(todayBookings);
  const weeklyRevenue = calculateTotalRevenue(weekBookings);
  const topService = getMostPopularService(weekBookings);
  const busiestHour = weekBookings
    .reduce<Record<string, number>>((accumulator, booking) => {
      const slot = `${booking.time.slice(0, 2)}:00`;
      accumulator[slot] = (accumulator[slot] || 0) + 1;
      return accumulator;
    }, {});

  const busiestSlot = Object.entries(busiestHour).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  if (loading) {
    return (
      <div className="space-y-12 animate-pulse">
        <div className="h-10 w-64 bg-gray-200 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((index) => (
            <div key={index} className="h-32 rounded-2xl bg-gray-100" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-4">
            {[1, 2, 3].map((index) => (
              <div key={index} className="h-28 rounded-2xl bg-gray-100" />
            ))}
          </div>
          <div className="h-64 rounded-3xl bg-gray-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <OwnerFocusPanel todayRevenue={todayRevenue} totalBookingsToday={todayBookings.length} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          label="Today's Revenue"
          value={todayRevenue}
          icon="💰"
          accent="rose"
          sub={`${todayBookings.length} appointment${todayBookings.length !== 1 ? "s" : ""}`}
        />
        <StatsCard
          label="Weekly Revenue"
          value={weeklyRevenue}
          icon="📈"
          accent="gold"
          sub="Last 7 days"
        />
        <StatsCard
          label="Top Service"
          value={topService ?? "—"}
          icon="🏆"
          accent="blue"
          sub="Most booked this week"
        />
        <StatsCard
          label="Busiest Hour"
          value={busiestSlot}
          icon="⏰"
          accent="green"
          sub="Highest booking count"
        />
      </div>

      <TodayActionsPanel />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-2">
              Today&apos;s Schedule
              <span className="ml-1 bg-brand-light text-brand text-xs font-semibold px-3 py-0.5 rounded-full">
                {todayBookings.length}
              </span>
            </h3>
            <button
              onClick={() => {
                setLoading(true);
                fetchBookings();
              }}
              className="text-xs font-semibold text-brand hover:underline flex items-center gap-1"
            >
              Refresh
            </button>
          </div>

          {todayBookings.length === 0 ? (
            <div className="glass rounded-3xl p-14 text-center border-2 border-dashed border-brand-light">
              <div className="text-5xl mb-4">🌸</div>
              <h4 className="font-bold text-lg text-text-main">No appointments today</h4>
              <p className="text-text-sub text-sm mt-1">
                Today is open. Use the action panel to follow up with inactive clients or tomorrow reminders.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {todayBookings.map((booking, index) => (
                <div
                  key={booking.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <BookingCard booking={booking} onStatusChange={updateBookingStatus} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="glass rounded-3xl p-6 space-y-4">
            <h3 className="text-xl font-bold">Data Integrity</h3>
            <div className="space-y-3 text-sm text-text-sub">
              <p>{bookings.length} bookings loaded from `dira:bookings`.</p>
              <p>{todayBookings.filter((booking) => !booking.phoneValid).length} bookings today need phone review.</p>
              <p>{todayBookings.filter((booking) => booking.needsRecommendation).length} bookings today are consultations.</p>
            </div>
          </div>

          <div className="bg-brand rounded-3xl p-6 text-white relative overflow-hidden shadow-premium">
            <div className="relative z-10">
              <h4 className="font-bold text-lg mb-3">System Status</h4>
              <p className="text-brand-light text-sm leading-relaxed">
                All dashboard numbers on this page are computed from stored bookings. No placeholder projections are used.
              </p>
            </div>
            <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
