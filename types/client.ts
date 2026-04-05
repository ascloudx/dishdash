export type ClientTag = "New" | "Regular" | "VIP" | "At Risk";
export type ClientLifecycle = "New" | "Active" | "Loyal" | "At Risk" | "Lost";

export interface Client {
  id: string;
  name: string;
  phone: string;
  phoneNormalized: string;
  phoneValid: boolean;
  totalVisits: number;
  totalSpent: number;
  lastVisit: string;
  tags: string[];
  note: string;
  notesHistory: string[];
  createdAt: string;
  tag: ClientTag;
  lifecycle: ClientLifecycle;
  score: number;
  priorityScore?: number;
  priorityReason?: string;
  nextActionHint?: string;
  preferences: string[];
  preferredTime?: string | null;
  preferredService?: string | null;
  isInactive: boolean;
  lastContactedAt?: string | null;
  reactivationEligible: boolean;
}
