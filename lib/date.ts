import { BUSINESS } from "@/config/business";
import { formatTimeTo12Hour, timeToMinutes } from "@/lib/time";

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
  return formatTimeTo12Hour(time);
}

export function getDateTimeForBusiness(date: string, time: string) {
  const totalMinutes = timeToMinutes(time) ?? 0;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
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
  const targetTotalMinutes = timeToMinutes(time) ?? 0;

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
