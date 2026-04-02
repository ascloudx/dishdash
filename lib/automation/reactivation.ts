import { getClients } from "@/lib/clients";
import { updateClientAutomationState } from "@/lib/automation/state";
import type { AutomationAction } from "@/lib/automation/types";
import { buildWhatsAppMessage, generateWhatsAppLink } from "@/lib/utils/whatsapp";

const VIP_SPEND_THRESHOLD = 250;
const CONTACT_COOLDOWN_DAYS = 7;
const INACTIVE_DAYS = 30;

function isOlderThan(date: string | null | undefined, now: Date, days: number) {
  if (!date) {
    return true;
  }

  return now.getTime() - new Date(date).getTime() > days * 24 * 60 * 60 * 1000;
}

function getSegment(totalVisits: number, totalSpent: number) {
  if (totalSpent > VIP_SPEND_THRESHOLD) return "VIP";
  if (totalVisits >= 2) return "Regular";
  return "New";
}

export async function runReactivationEngine(now = new Date()) {
  const clients = await getClients();
  const actions: AutomationAction[] = [];

  for (const client of clients) {
    const inactive = isOlderThan(`${client.lastVisit}T12:00:00.000Z`, now, INACTIVE_DAYS);
    const cooledDown = isOlderThan(client.lastContactedAt, now, CONTACT_COOLDOWN_DAYS);

    if (!inactive || !cooledDown || !client.reactivationEligible) {
      continue;
    }

    const segment = getSegment(client.totalVisits, client.totalSpent);
    const message =
      buildWhatsAppMessage("reactivation", {
        phone: client.phone,
        phoneValid: true,
        name: client.name,
      }) ?? "";

    const action: AutomationAction = {
      key: `${client.phoneNormalized}:reactivation`,
      type: "reactivation",
      clientId: client.id,
      name: client.name,
      phone: client.phone,
      phoneValid: client.phoneValid,
      serviceName: segment,
      message,
      whatsappLink: generateWhatsAppLink("reactivation", {
        phone: client.phone,
        phoneValid: client.phoneValid,
        name: client.name,
      }),
      helper: `${segment} client inactive since ${client.lastVisit}`,
      createdAt: now.toISOString(),
    };

    if (action.whatsappLink) {
      actions.push(action);
      await updateClientAutomationState(client.phoneNormalized, {
        lastContactedAt: now.toISOString(),
        reactivationEligible: false,
      });
    }
  }

  return actions;
}
