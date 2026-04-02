export const EDMONTON_TIMEZONE = "America/Edmonton";

function formatMinutes(minutes: number) {
  const normalized = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const meridiem = hours >= 12 ? "PM" : "AM";
  const twelveHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${twelveHour}:${String(mins).padStart(2, "0")} ${meridiem}`;
}

function formatDateInEdmonton(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: EDMONTON_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "12";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  const dayPeriod = (parts.find((part) => part.type === "dayPeriod")?.value ?? "AM")
    .replace(/\./g, "")
    .toUpperCase();
  return `${hour}:${minute} ${dayPeriod}`;
}

export function timeToMinutes(input: string) {
  const value = input.trim();
  const ampmMatch = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampmMatch) {
    const hours = Number(ampmMatch[1]);
    const minutes = Number(ampmMatch[2]);
    const meridiem = ampmMatch[3].toUpperCase();

    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
      return null;
    }

    const normalizedHours = meridiem === "AM" ? hours % 12 : (hours % 12) + 12;
    return normalizedHours * 60 + minutes;
  }

  const twentyFourMatch = value.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (twentyFourMatch) {
    return Number(twentyFourMatch[1]) * 60 + Number(twentyFourMatch[2]);
  }

  return null;
}

export function normalizeTimeInput(input: string) {
  const minutes = timeToMinutes(input);
  if (minutes === null) {
    return null;
  }

  return formatMinutes(minutes);
}

export function formatTimeTo12Hour(input: Date | string) {
  if (typeof input === "string") {
    return normalizeTimeInput(input) ?? input;
  }

  return formatDateInEdmonton(input);
}

export function convertToEdmontonTime(input: Date | string) {
  const date = typeof input === "string" ? new Date(input) : input;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: EDMONTON_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";
  const hour = parts.find((part) => part.type === "hour")?.value ?? "12";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  const dayPeriod = (parts.find((part) => part.type === "dayPeriod")?.value ?? "AM")
    .replace(/\./g, "")
    .toUpperCase();

  return `${year}-${month}-${day} ${hour}:${minute} ${dayPeriod}`;
}

export function compareTimeStrings(left: string, right: string) {
  return (timeToMinutes(left) ?? Number.MAX_SAFE_INTEGER) - (timeToMinutes(right) ?? Number.MAX_SAFE_INTEGER);
}

export function isTimeWithinHours(time: string, startHour: number, endHour: number) {
  const minutes = timeToMinutes(time);
  if (minutes === null) {
    return false;
  }

  return minutes >= startHour * 60 && minutes < endHour * 60;
}
