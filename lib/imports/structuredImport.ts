import { addCustomSlot } from "@/lib/slots";
import { combineDateTime, extractBookingTags, normalizePhone } from "@/lib/bookingValidation";
import { getServiceById, type ServiceId } from "@/config/services";
import { normalizeTimeInput } from "@/lib/time";
import type { Booking, BookingStatus } from "@/types/booking";
import type { NewBooking } from "@/lib/bookings";

export interface StructuredImportEntry {
  date: string;
  client: string;
  time?: string | null;
  price?: number | null;
  notes?: string;
  status?: string;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mapPriceToServiceId(price: number, notes: string): ServiceId {
  const lowerNotes = notes.toLowerCase();

  if (price === 110) {
    return "bridal";
  }

  if (price === 85) {
    return "luxe";
  }

  if (lowerNotes.includes("removal")) {
    return "consultation";
  }

  if (price >= 65 && price <= 75) {
    return "signature";
  }

  if (price >= 49 && price <= 60) {
    return "gel_extensions";
  }

  return "consultation";
}

function normalizeImportStatus(status?: string): BookingStatus {
  if (status?.toLowerCase() === "cancelled") {
    return "cancelled";
  }

  if (status?.toLowerCase() === "completed" || status?.toLowerCase() === "done") {
    return "completed";
  }

  return "upcoming";
}

function buildNotes(entry: StructuredImportEntry) {
  const notes = entry.notes?.trim() ?? "";
  const status = entry.status?.trim();

  if (status && status.toLowerCase() === "pending") {
    return notes ? `${notes} Pending.` : "Pending.";
  }

  return notes;
}

export function normalizeStructuredImportEntry(entry: StructuredImportEntry): NewBooking & { id: string; createdAt: string } {
  const name = entry.client.trim();
  if (!name) {
    throw new Error("Client name is required for every imported booking.");
  }

  const date = entry.date.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid import date: ${entry.date}`);
  }

  const normalizedTime = normalizeTimeInput(entry.time ?? "10:00 AM");
  if (!normalizedTime) {
    throw new Error(`Invalid import time for ${name}: ${entry.time}`);
  }

  const price = typeof entry.price === "number" && entry.price >= 0 ? entry.price : 59;
  const notes = buildNotes(entry);
  const serviceId = mapPriceToServiceId(price, notes);
  const service = getServiceById(serviceId);

  if (!service) {
    throw new Error(`Invalid service mapping for ${name}.`);
  }

  const emptyPhone = normalizePhone("");
  const tags = extractBookingTags(notes);
  const createdAt = `${combineDateTime(date, normalizedTime)}`;

  return {
    id: `import_${date}_${slugify(name)}_${slugify(normalizedTime)}_${price}`,
    name,
    phone: emptyPhone.raw,
    phoneNormalized: emptyPhone.normalized,
    phoneValid: emptyPhone.valid,
    serviceId,
    serviceName: serviceId === "consultation" && notes.toLowerCase().includes("removal")
      ? "Removal / Basic Set"
      : service.name,
    price,
    date,
    time: normalizedTime,
    datetime: combineDateTime(date, normalizedTime),
    notes,
    tags,
    status: normalizeImportStatus(entry.status),
    source: "manual",
    createdAt,
    needsRecommendation: serviceId === "consultation" ? true : undefined,
  };
}

export async function prepareStructuredImport(entries: StructuredImportEntry[]) {
  const imported = entries.map(normalizeStructuredImportEntry);

  for (const booking of imported) {
    await addCustomSlot(booking.time);
  }

  return imported;
}

export function upsertImportedBookings(current: Booking[], imported: Array<NewBooking & { id: string; createdAt: string }>) {
  const bookingMap = new Map(current.map((booking) => [booking.id, booking]));

  for (const booking of imported) {
    bookingMap.set(booking.id, {
      ...booking,
      type: booking.type ?? "booking",
      reminder24Sent: false,
      reminder2hSent: false,
    });
  }

  return Array.from(bookingMap.values()).sort((left, right) => left.datetime.localeCompare(right.datetime));
}
