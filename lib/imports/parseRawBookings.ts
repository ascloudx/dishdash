import { generateInsights } from "@/lib/imports/generateInsights";
import type { ImportedBooking, ImportedClient, ImportResult } from "@/lib/imports/types";

const MONTH_INDEX: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

const DEFAULT_PRICE = 59;
const DEFAULT_TIME = "10:00";

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeClientKey(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeWhitespace(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

function inferService(price: number) {
  if (price === 110) {
    return "Bridal Set";
  }

  if (price === 85) {
    return "Luxe Nail Set";
  }

  if (price >= 65 && price <= 75) {
    return "Signature Set";
  }

  if (price >= 49 && price <= 60) {
    return "Gel Extensions";
  }

  return "Basic Set";
}

function normalizeTimeTo24Hour(input: string) {
  const match = input
    .trim()
    .toUpperCase()
    .match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  if (!match) {
    return null;
  }

  const rawHour = Number(match[1]);
  const minute = Number(match[2] ?? "00");
  const meridiem = match[3];

  if (rawHour < 1 || rawHour > 12 || minute < 0 || minute > 59) {
    return null;
  }

  const normalizedHour = meridiem === "AM" ? rawHour % 12 : (rawHour % 12) + 12;
  return `${String(normalizedHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function extractTokens(rawSuffix: string) {
  const suffix = rawSuffix.trim();
  if (!suffix.startsWith("(") || !suffix.endsWith(")")) {
    return [];
  }

  return suffix
    .slice(1, -1)
    .split(",")
    .map((token) => normalizeWhitespace(token))
    .filter(Boolean);
}

function parseEntryLine(rawLine: string) {
  const priceMatch = rawLine.match(/\$([0-9]+(?:\.[0-9]+)?)/);
  const price = priceMatch ? Number(priceMatch[1]) : DEFAULT_PRICE;
  const leftSide = rawLine.split("-")[0] ?? rawLine;
  const clientName = normalizeWhitespace(leftSide);
  const suffix = rawLine.slice((priceMatch?.index ?? rawLine.length) + (priceMatch?.[0].length ?? 0));
  const tokens = extractTokens(suffix);
  const parsedTimes = tokens
    .map((token) => normalizeTimeTo24Hour(token))
    .filter((token): token is string => Boolean(token));
  const noteTokens = tokens.filter((token) => normalizeTimeTo24Hour(token) === null);

  const notes: string[] = [];
  if (!priceMatch) {
    notes.push(`Price missing in source, defaulted to ${DEFAULT_PRICE}.`);
  }
  if (noteTokens.length > 0) {
    notes.push(noteTokens.join(", "));
  }
  if (parsedTimes.length === 0) {
    notes.push("Time missing in source.");
  }

  return {
    clientName,
    price,
    times: parsedTimes.length > 0 ? parsedTimes : [DEFAULT_TIME],
    notes: notes.join(" ").trim() || undefined,
  };
}

function buildClients(bookings: ImportedBooking[]) {
  const grouped = new Map<string, ImportedBooking[]>();

  for (const booking of bookings) {
    const key = normalizeClientKey(booking.client_name);
    const existing = grouped.get(key) ?? [];
    existing.push(booking);
    grouped.set(key, existing);
  }

  const clients: ImportedClient[] = Array.from(grouped.entries()).map(([key, clientBookings]) => {
    const sorted = [...clientBookings].sort((left, right) => {
      if (left.date === right.date) {
        return left.time.localeCompare(right.time);
      }

      return left.date.localeCompare(right.date);
    });
    const timeFrequency = sorted.reduce<Record<string, number>>((accumulator, booking) => {
      accumulator[booking.time] = (accumulator[booking.time] ?? 0) + 1;
      return accumulator;
    }, {});
    const preferredTime =
      Object.entries(timeFrequency).sort((left, right) => right[1] - left[1])[0]?.[0] ?? undefined;

    return {
      id: `client_${slugify(key)}`,
      name: sorted[0]?.client_name ?? key,
      total_visits: sorted.length,
      total_spent: sorted.reduce((sum, booking) => sum + booking.price, 0),
      last_visit: sorted[sorted.length - 1]?.date ?? "",
      preferred_time: preferredTime,
    };
  });

  return clients.sort((left, right) => left.name.localeCompare(right.name));
}

function buildFrequencyMaps(bookings: ImportedBooking[]) {
  const timeFrequency = bookings.reduce<Record<string, number>>((accumulator, booking) => {
    accumulator[booking.time] = (accumulator[booking.time] ?? 0) + 1;
    return accumulator;
  }, {});
  const priceFrequency = bookings.reduce<Record<string, number>>((accumulator, booking) => {
    const key = String(booking.price);
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});

  return { timeFrequency, priceFrequency };
}

export function parseRawBookings(rawData: string, baseYear = new Date().getUTCFullYear()): ImportResult {
  const lines = rawData
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const bookings: ImportedBooking[] = [];
  let currentMonth: number | null = null;
  const dayCounters = new Map<number, number>();

  for (const line of lines) {
    const monthName = line.replace(/:$/, "").toLowerCase();
    if (monthName in MONTH_INDEX) {
      currentMonth = MONTH_INDEX[monthName];
      if (!dayCounters.has(currentMonth)) {
        dayCounters.set(currentMonth, 0);
      }
      continue;
    }

    if (!currentMonth) {
      continue;
    }

    const entry = parseEntryLine(line);
    const monthCounter = dayCounters.get(currentMonth) ?? 0;

    entry.times.forEach((time, index) => {
      const day = monthCounter + index + 1;
      const date = `${baseYear}-${String(currentMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const notes = [entry.notes, "Exact day unavailable in source; imported in listed order."]
        .filter(Boolean)
        .join(" ");

      bookings.push({
        id: `booking_${date}_${slugify(entry.clientName)}_${index + 1}`,
        client_name: entry.clientName,
        date,
        time,
        price: entry.price,
        service: inferService(entry.price),
        notes,
      });
    });

    dayCounters.set(currentMonth, monthCounter + entry.times.length);
  }

  const sortedBookings = bookings.sort((left, right) => {
    if (left.date === right.date) {
      return left.time.localeCompare(right.time);
    }

    return left.date.localeCompare(right.date);
  });
  const clients = buildClients(sortedBookings);
  const insights = generateInsights({
    bookings: sortedBookings,
    clients,
  });
  const { timeFrequency, priceFrequency } = buildFrequencyMaps(sortedBookings);
  const repeatClients = clients.filter((client) => client.total_visits > 1).length;

  return {
    bookings: sortedBookings,
    clients,
    insights,
    timeFrequency,
    priceFrequency,
    repeatClients,
  };
}
