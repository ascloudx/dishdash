'use client';

import { useState, useEffect, useCallback } from "react";
import CalendarView from "@/components/CalendarView";
import BookingCard from "@/components/BookingCard";
import BookingFormModal from "@/components/BookingFormModal";
import type { Booking, BookingStatus } from "@/types/booking";
import type { Service } from "@/config/services";
import { getTodayDateString } from "@/lib/date";

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
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
      console.error(error);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch("/api/services", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Request failed");
      }
      const data: Service[] = await res.json();
      setServices(data);
    } catch (error) {
      console.error(error);
      setServices([]);
    }
  }, []);

  const updateBookingStatus = useCallback(async (id: string, status: BookingStatus) => {
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

  const handleDelete = useCallback(async (booking: Booking) => {
    if (!window.confirm(`Delete booking for ${booking.name}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/bookings/delete?id=${encodeURIComponent(booking.id)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete booking");
      }

      setBookings((current) => current.filter((entry) => entry.id !== booking.id));
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
    fetchServices();
  }, [fetchBookings, fetchServices]);

  const filtered = search.trim()
    ? bookings.filter(
        (booking) =>
          booking.name.toLowerCase().includes(search.toLowerCase()) ||
          booking.phone.includes(search) ||
          booking.serviceName.toLowerCase().includes(search.toLowerCase())
      )
    : bookings;

  function openCreate() {
    setEditorMode("create");
    setSelectedBooking(null);
    setEditorOpen(true);
  }

  function openEdit(booking: Booking) {
    setEditorMode("edit");
    setSelectedBooking(booking);
    setEditorOpen(true);
  }

  function handleSaved(saved: Booking) {
    setBookings((current) => {
      const index = current.findIndex((booking) => booking.id === saved.id);
      if (index === -1) {
        return [...current, saved].sort((a, b) => a.datetime.localeCompare(b.datetime));
      }

      const next = [...current];
      next[index] = saved;
      return next.sort((a, b) => a.datetime.localeCompare(b.datetime));
    });
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-text-main">
            Bookings & Calendar <span>📅</span>
          </h2>
          <p className="text-text-sub mt-1">
            All {bookings.length} appointments are loaded from live booking data in Redis.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              setLoading(true);
              fetchBookings();
            }}
            className="rounded-full border border-white/80 bg-white/80 px-4 py-2.5 text-sm font-semibold text-text-sub"
          >
            Refresh
          </button>
          <button
            onClick={openCreate}
            className="rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white"
          >
            Add Booking
          </button>
        </div>
      </div>

      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-base">🔍</span>
        <input
          type="text"
          placeholder="Search by name, phone, or service…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-white text-text-main placeholder-text-muted shadow-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition text-sm"
        />
        {search ? (
          <button
            onClick={() => setSearch("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-brand text-lg transition-colors"
          >
            ✕
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-12 rounded-xl bg-gray-100" />
          {[1, 2, 3].map((index) => (
            <div key={index} className="h-28 rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : search.trim() ? (
        <div className="space-y-6">
          <p className="text-sm text-text-sub font-medium">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""} for &quot;{search}&quot;
          </p>
          {filtered.length === 0 ? (
            <div className="glass rounded-3xl p-14 text-center border-2 border-dashed border-brand-light">
              <div className="text-5xl mb-4">🔍</div>
              <h4 className="font-bold text-lg text-text-main">No results found</h4>
              <p className="text-text-sub text-sm mt-1">Try a different name, phone, or service.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filtered.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onStatusChange={updateBookingStatus}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <CalendarView
          bookings={bookings}
          initialDate={today}
          onStatusChange={updateBookingStatus}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      )}

      <BookingFormModal
        open={editorOpen}
        services={services}
        booking={selectedBooking}
        mode={editorMode}
        onClose={() => setEditorOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}
