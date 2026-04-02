export type ClientTag = "New" | "Regular" | "VIP";
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
  notesHistory: string[];
  createdAt: string;
  tag: ClientTag;
  lifecycle: ClientLifecycle;
  score: number;
  preferences: string[];
  isInactive: boolean;
  lastContactedAt?: string | null;
  reactivationEligible: boolean;
}
