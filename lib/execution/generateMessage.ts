import type { Client } from "@/types/client";
import { generateWhatsAppLink } from "@/lib/whatsapp";

export function generateMessage(params: {
  client: Client;
  slot?: string | null;
  service?: string | null;
  reason?: string | null;
}) {
  const slotLine = params.slot ? `I have a ${params.slot} opening` : "I have an opening";
  const serviceLine =
    params.service ?? params.client.preferredService
      ? `for a ${params.service ?? params.client.preferredService}`
      : "for your next set";
  const timingLine = params.client.preferredDayOfWeek
    ? ` It matches the ${params.client.preferredDayOfWeek.toLowerCase()} timing you usually book.`
    : params.client.preferredTime
      ? ` It lines up with your usual ${params.client.preferredTime.toLowerCase()} slot.`
      : "";
  const reasonLine = params.reason ? ` Thought of you because ${params.reason.toLowerCase()}` : "";
  const message = `Hey ${params.client.name} 💖 ${slotLine} ${serviceLine} today. Want me to hold it for you?${timingLine}${reasonLine}`.trim();

  return {
    message,
    messageLink:
      params.client.phoneValid && params.client.phoneNormalized
        ? generateWhatsAppLink(params.client.phoneNormalized, message)
        : null,
  };
}
