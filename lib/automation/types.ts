export type AutomationActionType =
  | "reminder_24h"
  | "reminder_2h"
  | "reactivation"
  | "manual_followup";

export type AutomationInsightType =
  | "low_bookings"
  | "gap_alert"
  | "peak_hours"
  | "top_service";

export interface AutomationAction {
  key: string;
  type: AutomationActionType;
  bookingId?: string;
  clientId?: string;
  name: string;
  phone: string;
  phoneValid: boolean;
  serviceName?: string;
  message: string;
  whatsappLink: string | null;
  helper: string;
  createdAt: string;
}

export interface AutomationInsight {
  type: AutomationInsightType;
  message: string;
  priority: "high" | "medium" | "low";
}

export interface AutomationCycleReport {
  generatedAt: string;
  reminders: AutomationAction[];
  reactivations: AutomationAction[];
  insights: AutomationInsight[];
}

export interface ClientAutomationState {
  phoneNormalized: string;
  lastContactedAt?: string | null;
  reactivationEligible: boolean;
}
