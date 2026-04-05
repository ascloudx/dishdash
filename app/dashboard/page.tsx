'use client';

import { useState, useEffect, useCallback } from "react";
import BookingCard from "@/components/BookingCard";
import OwnerFocusPanel from "@/components/OwnerFocusPanel";
import type { Booking } from "@/types/booking";
import type { DashboardPayload } from "@/lib/dashboard/types";
import { getTodayBookings } from "@/utils/calculateRevenue";
import { getTodayDateString } from "@/lib/date";
import { compareTimeStrings } from "@/lib/time";

export default function DashboardPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const today = getTodayDateString();

  const fetchBookings = useCallback(async () => {
    try {
      const [bookingsResponse, dashboardResponse] = await Promise.all([
        fetch("/api/bookings/list", { cache: "no-store" }),
        fetch("/api/dashboard", { cache: "no-store" }),
      ]);

      if (!bookingsResponse.ok || !dashboardResponse.ok) {
        throw new Error("Request failed");
      }
      const bookingsPayload: Booking[] = await bookingsResponse.json();
      const dashboardPayload: DashboardPayload = await dashboardResponse.json();
      setBookings(bookingsPayload);
      setDashboard(dashboardPayload);
    } catch (error) {
      console.error("Failed to fetch bookings", error);
      setBookings([]);
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateBookingStatus = useCallback(async (id: string, status: Booking["status"]) => {
    try {
      const response = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ updates: { status } }),
      });

      if (!response.ok) {
        throw new Error("Failed to update booking");
      }

      const updated = (await response.json()) as Booking;
      setBookings((current) =>
        current.map((booking) => (booking.id === updated.id ? updated : booking))
      );
      fetchBookings();
    } catch (error) {
      console.error(error);
    }
  }, [fetchBookings]);

  useEffect(() => {
    fetchBookings();
    const interval = setInterval(fetchBookings, 15000);
    return () => clearInterval(interval);
  }, [fetchBookings]);

  useEffect(() => {
    if (!dashboard || dashboard.actions.length === 0) {
      return;
    }

    const controller = new AbortController();

    void fetch("/api/actions/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        date: today,
        briefSummary: dashboard.dailyBrief.recommendedAction,
        missedOpportunities: dashboard.engagement.missedOpportunities,
        events: dashboard.actions.map((action) => ({
          actionId: action.id,
          eventType: "shown",
          timestamp: new Date().toISOString(),
          dataReference: action.dataReference,
          slot: action.slot,
          clientIds: action.clientIds,
          bookingIds: action.bookingIds,
        })),
      }),
    }).catch((error) => {
      if (error instanceof Error && error.name !== "AbortError") {
        console.error(error);
      }
    });

    return () => controller.abort();
  }, [dashboard, today]);

  const todayBookings = getTodayBookings(bookings, today).sort((a, b) => compareTimeStrings(a.time, b.time));

  if (loading) {
    return (
      <div className="space-y-10 animate-pulse">
        <div className="h-10 w-64 bg-gray-200 rounded-xl" />
        <div className="h-[320px] rounded-[2rem] bg-gray-100" />
        <div className="grid grid-cols-1 gap-10">
          <div className="space-y-4">
            {[1, 2, 3].map((index) => (
              <div key={index} className="h-28 rounded-2xl bg-gray-100" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {dashboard ? <OwnerFocusPanel data={dashboard} /> : null}

      <div className="space-y-6">
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
              {dashboard?.actions[0]?.title ?? dashboard?.dailyFlow.morningPlan ?? "No actions available."}
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
    </div>
  );
}
