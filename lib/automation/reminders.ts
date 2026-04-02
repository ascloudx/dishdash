import { formatBusinessTime } from "@/lib/date";
import { getBookings, updateBooking } from "@/lib/bookings";
import type { AutomationAction } from "@/lib/automation/types";
import { buildWhatsAppMessage, generateWhatsAppLink } from "@/lib/utils/whatsapp";

function getHoursUntil(datetime: string, now: Date) {
  return (new Date(datetime).getTime() - now.getTime()) / (1000 * 60 * 60);
}

function createReminderAction(params: {
  key: string;
  type: "reminder_24h" | "reminder_2h";
  bookingId: string;
  name: string;
  phone: string;
  phoneValid: boolean;
  serviceName: string;
  time: string;
}): AutomationAction {
  const message = buildWhatsAppMessage(params.type, {
    phone: params.phone,
    phoneValid: params.phoneValid,
    name: params.name,
    serviceName: params.serviceName,
    time: formatBusinessTime(params.time),
  }) ?? "";

  return {
    key: params.key,
    type: params.type,
    bookingId: params.bookingId,
    name: params.name,
    phone: params.phone,
    phoneValid: params.phoneValid,
    serviceName: params.serviceName,
    message,
    whatsappLink: generateWhatsAppLink(params.type, {
      phone: params.phone,
      phoneValid: params.phoneValid,
      name: params.name,
      serviceName: params.serviceName,
      time: formatBusinessTime(params.time),
    }),
    helper:
      params.type === "reminder_24h"
        ? `Tomorrow at ${formatBusinessTime(params.time)}`
        : `Within 2 hours at ${formatBusinessTime(params.time)}`,
    createdAt: new Date().toISOString(),
  };
}

export async function runReminderEngine(now = new Date()) {
  const bookings = await getBookings();
  const actions: AutomationAction[] = [];

  for (const booking of bookings) {
    if (booking.status !== "upcoming" || !booking.datetime) {
      continue;
    }

    const hoursUntil = getHoursUntil(booking.datetime, now);
    if (hoursUntil <= 24 && hoursUntil > 23 && !booking.reminder24Sent) {
      const action = createReminderAction({
        key: `${booking.id}:reminder_24h`,
        type: "reminder_24h",
        bookingId: booking.id,
        name: booking.name,
        phone: booking.phone,
        phoneValid: booking.phoneValid,
        serviceName: booking.serviceName,
        time: booking.time,
      });

      if (action.whatsappLink) {
        actions.push(action);
        await updateBooking(booking.id, {
          reminder24Sent: true,
          reminder24SentAt: now.toISOString(),
        });
      }
    }

    if (hoursUntil <= 2 && hoursUntil > 1 && !booking.reminder2hSent) {
      const action = createReminderAction({
        key: `${booking.id}:reminder_2h`,
        type: "reminder_2h",
        bookingId: booking.id,
        name: booking.name,
        phone: booking.phone,
        phoneValid: booking.phoneValid,
        serviceName: booking.serviceName,
        time: booking.time,
      });

      if (action.whatsappLink) {
        actions.push(action);
        await updateBooking(booking.id, {
          reminder2hSent: true,
          reminder2hSentAt: now.toISOString(),
        });
      }
    }
  }

  return actions;
}
