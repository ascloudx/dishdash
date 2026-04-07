import type { SlotMatch } from "@/lib/intelligence/matchClientsToSlots";
import type { PrioritizedClient } from "@/lib/intelligence/prioritizeClients";
import type { GeneratedInsights } from "@/lib/insights/generateInsights";
import { generateMessage } from "@/lib/execution/generateMessage";

export interface GeneratedAction {
  id: string;
  title: string;
  reason: string;
  clientNames: string[];
  dataReference: string;
  clientIds: string[];
  bookingIds: string[];
  slot: string | null;
  message: string | null;
  messageLink: string | null;
  executionType: "whatsapp" | "review" | "book";
  priorityScore: number;
  href?: string | null;
}

function getClientHref(clientId: string) {
  return `/clients/${encodeURIComponent(clientId)}`;
}

export function generateActions(params: {
  insights: GeneratedInsights;
  slotMatches: SlotMatch[];
  prioritizedClients: PrioritizedClient[];
}): GeneratedAction[] {
  const actions: GeneratedAction[] = [];
  const usedClientIds = new Set<string>();

  const topSlotMatch = params.slotMatches[0];
  if (topSlotMatch && topSlotMatch.candidates[0]) {
    const topCandidate = topSlotMatch.candidates[0];
    const prioritizedClient = params.prioritizedClients.find((entry) => entry.clientId === topCandidate.clientId);
    const outreach = prioritizedClient
      ? generateMessage({
          client: prioritizedClient.client,
          slot: topSlotMatch.slot,
          service: topCandidate.preferredService,
          reason: topCandidate.reason,
        })
      : { message: null, messageLink: null };

    actions.push({
      id: `action:slot:${topSlotMatch.slot}:${topCandidate.clientId}`,
      title:
        topSlotMatch.candidates.length > 1
          ? outreach.messageLink
            ? `Message ${topCandidate.name} and ${topSlotMatch.candidates.length - 1} others to fill ${topSlotMatch.slot}`
            : `Review ${topCandidate.name} and ${topSlotMatch.candidates.length - 1} others for ${topSlotMatch.slot}`
          : outreach.messageLink
            ? `Message ${topCandidate.name} to fill ${topSlotMatch.slot}`
            : `Review ${topCandidate.name} for ${topSlotMatch.slot}`,
      reason: outreach.messageLink
        ? topCandidate.reason
        : `${topCandidate.reason} No valid phone is stored, so this needs a manual follow-up.`,
      clientNames: topSlotMatch.candidates.map((candidate) => candidate.name),
      dataReference: `dead_slot:${topSlotMatch.slot}`,
      clientIds: topSlotMatch.candidates.map((candidate) => candidate.clientId),
      bookingIds: [],
      slot: topSlotMatch.slot,
      message: outreach.message,
      messageLink: outreach.messageLink,
      executionType: outreach.messageLink ? "whatsapp" : "review",
      priorityScore: topCandidate.fitScore,
      href: outreach.messageLink ? outreach.messageLink : getClientHref(topCandidate.clientId),
    });
    topSlotMatch.candidates.forEach((candidate) => usedClientIds.add(candidate.clientId));
  }

  const nextRecoveryClient =
    params.prioritizedClients.find((client) => !usedClientIds.has(client.clientId)) ??
    params.prioritizedClients[0];

  if (params.insights.lowBookingWarning && nextRecoveryClient) {
    const client = nextRecoveryClient;
    const outreach = generateMessage({
      client: client.client,
      slot: params.slotMatches[0]?.slot ?? null,
      service: client.client.preferredService ?? null,
      reason: client.reason,
    });

    actions.push({
      id: `action:recovery:${client.clientId}`,
      title: outreach.messageLink
        ? `Message ${client.name} to lift today's bookings`
        : `Review ${client.name} to lift today's bookings`,
      reason: outreach.messageLink
        ? params.insights.lowBookingWarning.message
        : `${params.insights.lowBookingWarning.message} No valid phone is stored, so review this client manually.`,
      clientNames: [client.name],
      dataReference: "low_bookings:capacity",
      clientIds: [client.clientId],
      bookingIds: [],
      slot: params.slotMatches[0]?.slot ?? null,
      message: outreach.message,
      messageLink: outreach.messageLink,
      executionType: outreach.messageLink ? "whatsapp" : "review",
      priorityScore: client.priorityScore,
      href: outreach.messageLink ? outreach.messageLink : getClientHref(client.clientId),
    });
    usedClientIds.add(client.clientId);
  }

  const manualReviewClient = params.prioritizedClients.find(
    (client) => !client.client.phoneValid && !usedClientIds.has(client.clientId)
  );
  if (params.insights.lowBookingWarning && manualReviewClient) {
    actions.push({
      id: `action:manual-review:${manualReviewClient.clientId}`,
      title: `Review ${manualReviewClient.name} for rebooking`,
      reason: `${manualReviewClient.reason} No valid phone is stored, so review this client manually and update contact details before outreach.`,
      clientNames: [manualReviewClient.name],
      dataReference: "manual_review:missing_phone",
      clientIds: [manualReviewClient.clientId],
      bookingIds: [],
      slot: params.slotMatches[0]?.slot ?? null,
      message: null,
      messageLink: null,
      executionType: "review",
      priorityScore: manualReviewClient.priorityScore + 6,
      href: getClientHref(manualReviewClient.clientId),
    });
  }

  if (params.insights.revenueGap) {
    actions.push({
      id: "action:revenue-gap",
      title: "Push a same-day offer",
      reason: params.insights.revenueGap.message,
      clientNames: [],
      dataReference: "revenue_gap:daily_target",
      clientIds: [],
      bookingIds: [],
      slot: params.slotMatches[0]?.slot ?? null,
      message: null,
      messageLink: null,
      executionType: "review",
      priorityScore: Number(params.insights.revenueGap.data?.gap ?? 0),
      href: "/bookings",
    });
  }

  if (params.insights.topService) {
    const serviceName =
      typeof params.insights.topService.data?.serviceName === "string"
        ? params.insights.topService.data.serviceName
        : "top service";
    actions.push({
      id: `action:top-service:${serviceName}`,
      title: `Feature ${serviceName}`,
      reason: params.insights.topService.message,
      clientNames: [],
      dataReference: `top_service:${serviceName}`,
      clientIds: [],
      bookingIds: [],
      slot: null,
      message: null,
      messageLink: null,
      executionType: "review",
      priorityScore: Number(params.insights.topService.data?.count ?? 0) * 10,
      href: "/analytics",
    });
  }

  if (params.insights.peakHours.length > 0) {
    const peakSlot =
      typeof params.insights.peakHours[0]?.data?.slot === "string"
        ? params.insights.peakHours[0].data.slot
        : "peak window";
    actions.push({
      id: `action:peak:${peakSlot}`,
      title: "Review peak-hour pricing",
      reason: params.insights.peakHours[0].message,
      clientNames: [],
      dataReference: `peak_hours:${peakSlot}`,
      clientIds: [],
      bookingIds: [],
      slot: peakSlot,
      message: null,
      messageLink: null,
      executionType: "review",
      priorityScore: Number(params.insights.peakHours[0].data?.count ?? 0) * 8,
      href: "/dashboard/settings",
    });
  }

  return actions.sort((left, right) => right.priorityScore - left.priorityScore);
}
