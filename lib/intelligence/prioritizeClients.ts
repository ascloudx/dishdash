import type { Booking } from "@/types/booking";
import type { Client } from "@/types/client";
import { getTodayDateString } from "@/lib/date";

export interface PrioritizedClient {
  clientId: string;
  name: string;
  phoneNormalized: string;
  priorityScore: number;
  reason: string;
  nextActionHint: string;
  client: Client;
}

function daysSince(date: string, today: string) {
  const start = new Date(`${date}T12:00:00.000Z`).getTime();
  const end = new Date(`${today}T12:00:00.000Z`).getTime();
  return Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
}

function hasBookingToday(client: Client, bookings: Booking[], today: string) {
  return bookings.some(
    (booking) =>
      booking.type !== "blocked" &&
      booking.status !== "cancelled" &&
      booking.date === today &&
      booking.phoneNormalized === client.phoneNormalized
  );
}

function contactedRecently(client: Client) {
  if (!client.lastContactedAt) {
    return false;
  }

  const lastContact = new Date(client.lastContactedAt).getTime();
  return Date.now() - lastContact < 7 * 24 * 60 * 60 * 1000;
}

export function prioritizeClients(params: {
  clients: Client[];
  bookings: Booking[];
  today?: string;
}) {
  const today = params.today ?? getTodayDateString();

  return params.clients
    .filter((client) => client.phoneValid && !hasBookingToday(client, params.bookings, today))
    .map((client) => {
      const overdueDays = daysSince(client.lastVisit, today);
      const overdueWeight = overdueDays > 35 ? 30 : overdueDays > 21 ? 18 : overdueDays > 14 ? 10 : 0;
      const spendWeight = Math.round(client.totalSpent / 12);
      const frequencyWeight = client.totalVisits * 5;
      const riskWeight = client.lifecycle === "At Risk" || client.lifecycle === "Lost" ? 18 : 0;
      const recentContactPenalty = contactedRecently(client) ? 40 : 0;
      const priorityScore = Math.max(
        0,
        Math.round(client.score + overdueWeight + spendWeight + frequencyWeight + riskWeight - recentContactPenalty)
      );

      const reason =
        client.lifecycle === "At Risk" || client.lifecycle === "Lost"
          ? `${client.name} is overdue after ${overdueDays} days since the last visit.`
          : `${client.name} has ${client.totalVisits} visits and ${client.totalSpent.toLocaleString("en-CA")} in spend.`;

      const nextActionHint =
        client.preferredTime
          ? `Reach out for ${client.preferredTime.toLowerCase()} availability.`
          : client.preferredService
            ? `Reach out with a ${client.preferredService} opening.`
            : "Reach out with the next open slot.";

      return {
        clientId: client.id,
        name: client.name,
        phoneNormalized: client.phoneNormalized,
        priorityScore,
        reason,
        nextActionHint,
        client,
      } satisfies PrioritizedClient;
    })
    .sort((left, right) => right.priorityScore - left.priorityScore);
}
