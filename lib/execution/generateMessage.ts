import type { Client } from "@/types/client";
import { generateWhatsAppLink } from "@/lib/whatsapp";

export function generateMessage(params: {
  client: Client;
  slot?: string | null;
  service?: string | null;
  reason?: string | null;
}) {
  const slotLine = params.slot ? `I have a ${params.slot} opening` : "I have an opening";
  const serviceLine = params.service ? `for a ${params.service}` : "for your next set";
  const reasonLine = params.reason ? ` Thought of you because ${params.reason.toLowerCase()}` : "";
  const message = `Hey ${params.client.name} 💖 ${slotLine} ${serviceLine} today. Want me to hold it for you?${reasonLine}`.trim();

  return {
    message,
    messageLink:
      params.client.phoneValid && params.client.phoneNormalized
        ? generateWhatsAppLink(params.client.phoneNormalized, message)
        : null,
  };
}
