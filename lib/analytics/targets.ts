import type { Booking } from "@/types/booking";

export interface TargetProgress {
  current: number;
  target: number;
  progress: number;
}

function isActiveRevenueBooking(booking: Booking) {
  return booking.type !== "blocked" && booking.status !== "cancelled";
}

function toDateValue(date: string) {
  return new Date(`${date}T12:00:00.000Z`);
}

function clampProgress(current: number, target: number) {
  if (target <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((current / target) * 100));
}

function sumBookings(bookings: Booking[]) {
  return bookings.reduce((total, booking) => total + booking.price, 0);
}

export function getTargetProgress(params: {
  bookings: Booking[];
  today: string;
  dailyTarget: number;
  weeklyTarget: number;
  monthlyTarget: number;
  yearlyTarget: number;
}) {
  const activeBookings = params.bookings.filter(isActiveRevenueBooking);
  const todayValue = toDateValue(params.today);
  const currentMonth = todayValue.getUTCMonth();
  const currentYear = todayValue.getUTCFullYear();
  const sevenDaysAgo = new Date(todayValue);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);

  const dailyBookings = activeBookings.filter((booking) => booking.date === params.today);
  const weeklyBookings = activeBookings.filter((booking) => {
    const bookingDate = toDateValue(booking.date);
    return bookingDate >= sevenDaysAgo && bookingDate <= todayValue;
  });
  const monthlyBookings = activeBookings.filter((booking) => {
    const bookingDate = toDateValue(booking.date);
    return (
      bookingDate.getUTCFullYear() === currentYear &&
      bookingDate.getUTCMonth() === currentMonth
    );
  });
  const yearlyBookings = activeBookings.filter((booking) => {
    const bookingDate = toDateValue(booking.date);
    return bookingDate.getUTCFullYear() === currentYear;
  });

  const dailyCurrent = sumBookings(dailyBookings);
  const weeklyCurrent = sumBookings(weeklyBookings);
  const monthlyCurrent = sumBookings(monthlyBookings);
  const yearlyCurrent = sumBookings(yearlyBookings);

  return {
    daily: {
      current: dailyCurrent,
      target: params.dailyTarget,
      progress: clampProgress(dailyCurrent, params.dailyTarget),
    },
    weekly: {
      current: weeklyCurrent,
      target: params.weeklyTarget,
      progress: clampProgress(weeklyCurrent, params.weeklyTarget),
    },
    monthly: {
      current: monthlyCurrent,
      target: params.monthlyTarget,
      progress: clampProgress(monthlyCurrent, params.monthlyTarget),
    },
    yearly: {
      current: yearlyCurrent,
      target: params.yearlyTarget,
      progress: clampProgress(yearlyCurrent, params.yearlyTarget),
    },
  } satisfies Record<"daily" | "weekly" | "monthly" | "yearly", TargetProgress>;
}
