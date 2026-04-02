import type { AutomationActionType } from "@/lib/automation/types";

interface WhatsAppMessageData {
  phone: string;
  phoneValid?: boolean;
  name: string;
  serviceName?: string;
  time?: string;
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export function buildWhatsAppMessage(type: AutomationActionType, data: WhatsAppMessageData) {
  switch (type) {
    case "reminder_24h":
      return `Hi ${data.name}, reminder for your ${data.serviceName ?? "appointment"} appointment tomorrow at ${data.time ?? ""} 💅`.trim();
    case "reminder_2h":
      return `Hi ${data.name}, your appointment is in 2 hours at ${data.time ?? ""} ✨`.trim();
    case "reactivation":
      return `Hey ${data.name}, it’s been a while since your last visit 💖 Ready for your next set?`;
    case "manual_followup":
      return `Hey ${data.name}, wanted to follow up on your ${data.serviceName ?? "appointment"} 💖`;
    default:
      return null;
  }
}

export function generateWhatsAppLink(type: AutomationActionType, data: WhatsAppMessageData) {
  if (!data.phoneValid) {
    return null;
  }

  const normalizedPhone = normalizePhone(data.phone);
  if (!normalizedPhone) {
    return null;
  }

  const message = buildWhatsAppMessage(type, data);
  if (!message) {
    return null;
  }

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}
