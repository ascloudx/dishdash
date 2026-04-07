import { getServiceById, getServiceByInput, type ServiceId } from "@/config/services";
import {
  combineDateTime,
  extractBookingTags,
  normalizePhone,
} from "@/lib/bookingValidation";
import { redis } from "@/lib/redis";
import { addCustomSlot } from "@/lib/slots";
import { normalizeTimeInput } from "@/lib/time";
import type { Booking, BookingSource, BookingStatus } from "@/types/booking";
import {
  prepareStructuredImport,
  type StructuredImportEntry,
  upsertImportedBookings,
} from "@/lib/imports/structuredImport";

const BOOKINGS_KEY = "dira:bookings";

interface LegacyBookingRecord {
  id?: string;
  type?: string;
  createdAt?: string;
  status?: string;
  source?: string;
  name?: string;
  phone?: string;
  phoneNormalized?: string;
  phoneValid?: boolean;
  service?: string;
  serviceId?: string;
  serviceName?: string;
  price?: number;
  date?: string;
  time?: string;
  datetime?: string;
  notes?: string;
  tags?: string[];
  needsRecommendation?: boolean;
  reminder24Sent?: boolean;
  reminder24SentAt?: string;
  reminder2hSent?: boolean;
  reminder2hSentAt?: string;
}

export type NewBooking = Omit<Booking, "id" | "createdAt">;
export type BookingUpdates = Partial<
  Pick<
    Booking,
    | "name"
    | "phone"
    | "serviceId"
    | "price"
    | "date"
    | "time"
    | "notes"
    | "status"
    | "source"
    | "reminder24Sent"
    | "reminder24SentAt"
    | "reminder2hSent"
    | "reminder2hSentAt"
  >
>;

async function readBookings(): Promise<Booking[]> {
  const records = await redis.getJSON<LegacyBookingRecord[]>(BOOKINGS_KEY);

  if (!Array.isArray(records)) {
    return [];
  }

  return records
    .map(normalizeBookingRecord)
    .filter((booking): booking is Booking => booking !== null)
    .sort((a, b) => a.datetime.localeCompare(b.datetime));
}

async function writeBookings(bookings: Booking[]) {
  await redis.setJSON(
    BOOKINGS_KEY,
    bookings.map((booking) => ({
      ...booking,
      service: booking.serviceName,
    }))
  );
}

export async function getBookings() {
  return readBookings();
}

export async function addBooking(booking: NewBooking) {
  const current = await readBookings();
  await addCustomSlot(booking.time);
  const nextBooking: Booking = {
    ...booking,
    type: booking.type ?? "booking",
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    reminder24Sent: booking.reminder24Sent ?? false,
    reminder2hSent: booking.reminder2hSent ?? false,
  };

  await writeBookings([...current, nextBooking]);
  return nextBooking;
}

export async function addBlockedSlot(input: { date: string; time: string; notes?: string }) {
  const current = await readBookings();
  const normalizedTime = normalizeTimeInput(input.time);
  if (!normalizedTime) {
    throw new Error("Invalid slot time.");
  }
  await addCustomSlot(normalizedTime);
  const blockedSlot: Booking = {
    id: crypto.randomUUID(),
    type: "blocked",
    name: "Blocked Slot",
    phone: "",
    phoneNormalized: "",
    phoneValid: false,
    serviceId: "consultation",
    serviceName: "Blocked Slot",
    price: 0,
    date: input.date,
    time: normalizedTime,
    datetime: combineDateTime(input.date, normalizedTime),
    notes: input.notes?.trim() ?? "",
    tags: ["blocked"],
    status: "upcoming",
    source: "manual",
    createdAt: new Date().toISOString(),
    needsRecommendation: false,
    reminder24Sent: true,
    reminder2hSent: true,
  };

  await writeBookings([...current, blockedSlot]);
  return blockedSlot;
}

export async function updateBooking(id: string, updates: BookingUpdates) {
  const current = await readBookings();
  const index = current.findIndex((booking) => booking.id === id);

  if (index === -1) {
    return null;
  }

  const existing = current[index];
  const phoneInfo =
    "phone" in updates && typeof updates.phone === "string"
      ? normalizePhone(updates.phone)
      : {
          raw: existing.phone,
          normalized: existing.phoneNormalized,
          valid: existing.phoneValid,
        };

  const service =
    "serviceId" in updates && updates.serviceId
      ? getServiceById(updates.serviceId)
      : getServiceById(existing.serviceId);

  if (!service) {
    throw new Error("Invalid service configuration.");
  }

  const date = updates.date ?? existing.date;
  const time = normalizeTimeInput(updates.time ?? existing.time);
  if (!time) {
    throw new Error("Invalid booking time.");
  }
  const notes = updates.notes ?? existing.notes;
  const tags = extractBookingTags(notes);
  const nextPrice =
    typeof updates.price === "number"
      ? updates.price
      : "serviceId" in updates && updates.serviceId
        ? service.price
        : existing.price;

  const updatedBooking: Booking = {
    ...existing,
    ...updates,
    phone: phoneInfo.raw,
    phoneNormalized: phoneInfo.normalized,
    phoneValid: phoneInfo.valid,
    serviceId: service.id,
    serviceName: service.name,
    price: nextPrice,
    date,
    time,
    datetime: combineDateTime(date, time),
    notes,
    tags,
    needsRecommendation: service.id === "consultation" ? true : undefined,
  };

  await addCustomSlot(time);
  const next = [...current];
  next[index] = updatedBooking;
  await writeBookings(next);

  return updatedBooking;
}

export async function deleteBooking(id: string) {
  const current = await readBookings();
  const next = current.filter((booking) => booking.id !== id);

  if (next.length === current.length) {
    return false;
  }

  await writeBookings(next);
  return true;
}

export async function importStructuredBookings(entries: StructuredImportEntry[]) {
  const current = await readBookings();
  const imported = await prepareStructuredImport(entries);
  const next = upsertImportedBookings(current, imported);
  await writeBookings(next);

  return {
    imported: imported.length,
    total: next.length,
  };
}

function normalizeBookingRecord(record: LegacyBookingRecord): Booking | null {
  const id = record.id?.trim();
  const type = record.type === "blocked" ? "blocked" : "booking";
  const name = record.name?.trim() ?? "";
  const phone = record.phone?.trim() ?? "";
  const date = record.date?.trim() ?? "";
  const time = normalizeTimeInput(record.time ?? "") ?? "";

  if (type === "blocked") {
    if (!id || !date || !time) {
      return null;
    }

    return {
      id,
      type,
      name: name || "Blocked Slot",
      phone: "",
      phoneNormalized: "",
      phoneValid: false,
      serviceId: "consultation",
      serviceName: "Blocked Slot",
      price: 0,
      date,
      time,
      datetime: record.datetime?.trim() || combineDateTime(date, time),
      notes: record.notes?.trim() ?? "",
      tags: ["blocked"],
      status: "upcoming",
      source: "manual",
      createdAt: record.createdAt?.trim() || new Date(combineDateTime(date, time)).toISOString(),
      needsRecommendation: false,
      reminder24Sent: true,
      reminder2hSent: true,
    };
  }

  const service =
    (record.serviceId && getServiceById(record.serviceId)) ||
    getServiceByInput(record.serviceName ?? record.service ?? "");

  if (!id || !name || !service || !date || !time) {
    if (!service && (record.serviceId || record.serviceName || record.service)) {
      console.error("Skipping booking with invalid service", {
        id,
        serviceId: record.serviceId,
        serviceName: record.serviceName ?? record.service,
      });
    }
    return null;
  }

  const phoneInfo = normalizePhone(phone);
  const status = normalizeStatus(record.status);
  const source = normalizeSource(record.source);
  const notes = record.notes?.trim() ?? "";
  const price =
    typeof record.price === "number" && record.price >= 0 ? record.price : service.price;

  return {
    id,
    type,
    name,
    phone,
    phoneNormalized: record.phoneNormalized ?? phoneInfo.normalized,
    phoneValid: typeof record.phoneValid === "boolean" ? record.phoneValid : phoneInfo.valid,
    serviceId: service.id,
    serviceName: record.serviceName?.trim() || service.name,
    price,
    date,
    time,
    datetime: record.datetime?.trim() || combineDateTime(date, time),
    notes,
    tags: Array.isArray(record.tags) ? record.tags : extractBookingTags(notes),
    status,
    source,
    createdAt: record.createdAt?.trim() || new Date(combineDateTime(date, time)).toISOString(),
    needsRecommendation:
      typeof record.needsRecommendation === "boolean"
        ? record.needsRecommendation
        : service.id === "consultation"
          ? true
          : undefined,
    reminder24Sent: record.reminder24Sent ?? false,
    reminder24SentAt: record.reminder24SentAt,
    reminder2hSent: record.reminder2hSent ?? false,
    reminder2hSentAt: record.reminder2hSentAt,
  };
}

function normalizeStatus(status?: string): BookingStatus {
  if (status === "completed" || status === "done") {
    return "completed";
  }
  if (status === "cancelled") {
    return "cancelled";
  }
  return "upcoming";
}

function normalizeSource(source?: string): BookingSource {
  return source === "manual" ? "manual" : "website";
}

export function filterActiveBookings(bookings: Booking[]) {
  return bookings.filter((booking) => booking.type !== "blocked" && booking.status !== "cancelled");
}

export function filterCompletedRevenueBookings(bookings: Booking[]) {
  return bookings.filter((booking) => booking.type !== "blocked" && booking.status !== "cancelled");
}

export function getBookingServiceId(booking: Booking): ServiceId {
  return booking.serviceId;
}
