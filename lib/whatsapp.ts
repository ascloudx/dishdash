function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `1${digits}`;
  }
  return digits;
}

export function generateWhatsAppLink(phone: string, message: string) {
  const normalizedPhone = normalizePhone(phone);
  const params = new URLSearchParams({ text: message });
  return `https://wa.me/${normalizedPhone}?${params.toString()}`;
}

export function buildReminderMessage(name: string, time: string) {
  return `Hey ${name} 💖\nJust a reminder for your appointment tomorrow at ${time} ✨`;
}

export function buildFollowUpMessage(name: string) {
  return `Hey ${name} 💖\nIt’s been a while since your last visit ✨\nWould love to see you again 💅`;
}

export function buildRebookingMessage(name: string) {
  return `Hey ${name} 💖\nWant me to book your next set? 💅`;
}

export function buildUrgentMessage(name: string, time: string) {
  return `Hey ${name} 💖\nYour appointment is coming up at ${time} today ✨\nSee you soon 💅`;
}
