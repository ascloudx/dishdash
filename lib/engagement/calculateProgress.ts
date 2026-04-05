import type { Booking } from "@/types/booking";
import type { WeeklyProgress } from "@/lib/engagement/types";

function sumRevenue(bookings: Booking[]) {
  return bookings.reduce((total, booking) => total + booking.price, 0);
}

function toDateValue(date: string) {
  return new Date(`${date}T12:00:00.000Z`);
}

export function calculateProgress(params: {
  bookings: Booking[];
  today: string;
  weeklyTarget: number;
}): WeeklyProgress {
  const activeBookings = params.bookings.filter(
    (booking) => booking.type !== "blocked" && booking.status !== "cancelled"
  );
  const today = toDateValue(params.today);
  const currentWeekStart = new Date(today);
  currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() - 6);
  const previousWeekStart = new Date(currentWeekStart);
  previousWeekStart.setUTCDate(previousWeekStart.getUTCDate() - 7);
  const previousWeekEnd = new Date(currentWeekStart);
  previousWeekEnd.setUTCDate(previousWeekEnd.getUTCDate() - 1);

  const currentWeekRevenue = sumRevenue(
    activeBookings.filter((booking) => {
      const value = toDateValue(booking.date);
      return value >= currentWeekStart && value <= today;
    })
  );
  const lastWeekRevenue = sumRevenue(
    activeBookings.filter((booking) => {
      const value = toDateValue(booking.date);
      return value >= previousWeekStart && value <= previousWeekEnd;
    })
  );
  const progressPercent =
    params.weeklyTarget > 0
      ? Math.min(100, Math.round((currentWeekRevenue / params.weeklyTarget) * 100))
      : 0;

  return {
    currentRevenue: currentWeekRevenue,
    targetRevenue: params.weeklyTarget,
    progressPercent,
    lastWeekRevenue,
    differenceFromLastWeek: currentWeekRevenue - lastWeekRevenue,
  };
}
