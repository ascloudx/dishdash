import { BUSINESS } from "@/config/business";

function getDateParts(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

function toUtcDate(date: string) {
  const { year, month, day } = getDateParts(date);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getTodayDateString(timeZone = BUSINESS.timezone) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date());
}

export function formatBusinessDate(
  date: string,
  options: Intl.DateTimeFormatOptions
) {
  return new Intl.DateTimeFormat(BUSINESS.locale, {
    timeZone: BUSINESS.timezone,
    ...options,
  }).format(toUtcDate(date));
}

export function addDaysToDateString(date: string, days: number) {
  const value = toUtcDate(date);
  value.setUTCDate(value.getUTCDate() + days);
  return toDateString(value);
}

export function getWeekStartDateString(date: string) {
  const value = toUtcDate(date);
  const day = value.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setUTCDate(value.getUTCDate() + diff);
  return toDateString(value);
}

export function isOlderThanDays(date: string, compareTo: string, days: number) {
  const lhs = toUtcDate(date).getTime();
  const rhs = toUtcDate(compareTo).getTime();
  return rhs - lhs > days * 24 * 60 * 60 * 1000;
}

export function formatBusinessTime(time: string) {
  const match = time.match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    return time;
  }

  const date = new Date(Date.UTC(2026, 0, 1, Number(match[1]), Number(match[2])));
  return new Intl.DateTimeFormat(BUSINESS.locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: BUSINESS.timezone,
  }).format(date);
}

export function getDateTimeForBusiness(date: string, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const { year, month, day } = getDateParts(date);
  return new Date(Date.UTC(year, month - 1, day, hours, minutes));
}

export function getHoursUntil(date: string, time: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const currentDate = `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}-${parts.find((part) => part.type === "day")?.value}`;
  const currentHour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const currentMinute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  const currentTotalMinutes = currentHour * 60 + currentMinute;
  const [hours, minutes] = time.split(":").map(Number);
  const targetTotalMinutes = hours * 60 + minutes;

  if (date === currentDate) {
    return (targetTotalMinutes - currentTotalMinutes) / 60;
  }

  if (date > currentDate) {
    const daysAhead =
      (toUtcDate(date).getTime() - toUtcDate(currentDate).getTime()) /
      (1000 * 60 * 60 * 24);
    return daysAhead * 24 + (targetTotalMinutes - currentTotalMinutes) / 60;
  }

  return -1;
}
