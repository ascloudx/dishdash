import { getServiceById, type ServiceId } from "@/config/services";
import type { Booking, BookingSource, BookingStatus } from "@/types/booking";

export interface BookingFormInput {
  name: string;
  phone: string;
  serviceId: string;
  date: string;
  time: string;
  notes?: string;
  source?: BookingSource;
}

export interface NormalizedPhone {
  raw: string;
  normalized: string;
  valid: boolean;
}

export type BookingUpdateInput = Partial<
  Pick<Booking, "name" | "phone" | "serviceId" | "price" | "date" | "time" | "notes" | "status" | "source">
>;

export interface NormalizedBookingInput {
  name: string;
  phone: string;
  phoneNormalized: string;
  phoneValid: boolean;
  serviceId: ServiceId;
  serviceName: string;
  price: number;
  date: string;
  time: string;
  datetime: string;
  notes: string;
  tags: string[];
  status: BookingStatus;
  source: BookingSource;
  needsRecommendation?: boolean;
}

function isValidDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function isValidTime(time: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}

export function normalizePhone(phone: string): NormalizedPhone {
  const raw = phone.trim();
  const normalized = raw.replace(/\D/g, "");
  const valid = normalized.length >= 10 && normalized.length <= 15;

  return {
    raw,
    normalized,
    valid,
  };
}

export function to24HourTime(time: string) {
  const value = time.trim();
  if (isValidTime(value)) {
    return value;
  }

  const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = match[2];
  const meridiem = match[3].toUpperCase();

  if (hours < 1 || hours > 12) {
    return null;
  }

  const normalizedHours = meridiem === "AM" ? hours % 12 : (hours % 12) + 12;
  return `${String(normalizedHours).padStart(2, "0")}:${minutes}`;
}

export function combineDateTime(date: string, time: string) {
  return `${date}T${time}:00.000Z`;
}

export function extractBookingTags(notes: string) {
  const lower = notes.toLowerCase();
  const tags = new Set<string>();

  if (lower.includes("birthday")) {
    tags.add("birthday");
    tags.add("occasion:birthday");
  }
  if (lower.includes("wedding")) {
    tags.add("vip");
    tags.add("occasion:wedding");
  }
  if (lower.includes("evening") || lower.includes("night")) {
    tags.add("time:evening");
  }
  if (lower.includes("nude")) {
    tags.add("style:nude");
  }
  if (lower.includes("chrome")) {
    tags.add("style:chrome");
  }

  return Array.from(tags);
}

export function validateBookingInput(
  input: BookingFormInput
):
  | { ok: true; value: NormalizedBookingInput }
  | { ok: false; error: string } {
  const name = input.name?.trim() ?? "";
  const phone = normalizePhone(input.phone ?? "");
  const service = getServiceById(input.serviceId?.trim() ?? "");
  const date = input.date?.trim() ?? "";
  const time = to24HourTime(input.time ?? "");
  const notes = (input.notes ?? "").trim();
  const source = input.source === "manual" ? "manual" : "website";

  if (!name) {
    return { ok: false, error: "Name is required." };
  }

  if (!phone.raw) {
    return { ok: false, error: "Phone is required." };
  }

  if (!service) {
    return { ok: false, error: "Please select a valid service." };
  }

  if (!isValidDate(date)) {
    return { ok: false, error: "Date must be in YYYY-MM-DD format." };
  }

  if (!time || !isValidTime(time)) {
    return { ok: false, error: "Time must be in HH:mm or h:mm AM/PM format." };
  }

  return {
    ok: true,
    value: {
      name,
      phone: phone.raw,
      phoneNormalized: phone.normalized,
      phoneValid: phone.valid,
      serviceId: service.id,
      serviceName: service.name,
      price: service.price,
      date,
      time,
      datetime: combineDateTime(date, time),
      notes,
      tags: extractBookingTags(notes),
      status: "upcoming",
      source,
      needsRecommendation: service.id === "consultation" ? true : undefined,
    },
  };
}

export function validateBookingUpdates(
  input: BookingUpdateInput
):
  | { ok: true; value: BookingUpdateInput }
  | { ok: false; error: string } {
  const updates: BookingUpdateInput = {};

  if ("name" in input) {
    const name = input.name?.trim() ?? "";
    if (!name) {
      return { ok: false, error: "Name cannot be empty." };
    }
    updates.name = name;
  }

  if ("phone" in input) {
    const phone = input.phone?.trim() ?? "";
    if (!phone) {
      return { ok: false, error: "Phone cannot be empty." };
    }
    updates.phone = phone;
  }

  if ("serviceId" in input) {
    const service = getServiceById(input.serviceId ?? "");
    if (!service) {
      return { ok: false, error: "Please select a valid service." };
    }
    updates.serviceId = service.id;
    if (!("price" in input)) {
      updates.price = service.price;
    }
  }

  if ("price" in input) {
    if (typeof input.price !== "number" || Number.isNaN(input.price) || input.price < 0) {
      return { ok: false, error: "Price must be a valid number." };
    }
    updates.price = input.price;
  }

  if ("date" in input) {
    const date = input.date?.trim() ?? "";
    if (!isValidDate(date)) {
      return { ok: false, error: "Date must be in YYYY-MM-DD format." };
    }
    updates.date = date;
  }

  if ("time" in input) {
    const time = to24HourTime(input.time ?? "");
    if (!time || !isValidTime(time)) {
      return { ok: false, error: "Time must be in HH:mm or h:mm AM/PM format." };
    }
    updates.time = time;
  }

  if ("notes" in input) {
    updates.notes = input.notes?.trim() ?? "";
  }

  if ("status" in input) {
    if (!input.status || !["upcoming", "completed", "cancelled"].includes(input.status)) {
      return { ok: false, error: "Status must be upcoming, completed, or cancelled." };
    }
    updates.status = input.status;
  }

  if ("source" in input) {
    if (!input.source || !["website", "manual"].includes(input.source)) {
      return { ok: false, error: "Source must be website or manual." };
    }
    updates.source = input.source;
  }

  return { ok: true, value: updates };
}
