import type { ImportedClient } from "@/lib/imports/types";

export function suggestMessage(client: ImportedClient) {
  const slot = client.preferred_time ?? "10:00";
  const [hourText, minuteText] = slot.split(":");
  const hour = Number(hourText);
  const meridiem = hour >= 12 ? "PM" : "AM";
  const normalizedHour = hour % 12 === 0 ? 12 : hour % 12;
  const formattedSlot = `${normalizedHour}:${minuteText} ${meridiem}`;

  return `Hey ${client.name} 💖 I have a ${formattedSlot} slot tomorrow, want me to book you in?`;
}
