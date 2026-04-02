import type { ServiceId } from "@/config/services";

export type BookingStatus = "upcoming" | "completed" | "cancelled";
export type BookingSource = "website" | "manual";

export interface Booking {
  id: string;
  name: string;
  phone: string;
  phoneNormalized: string;
  phoneValid: boolean;
  serviceId: ServiceId;
  serviceName: string;
  price: number;
  date: string;
  time: string;
  datetime: string;
  notes: string;
  tags: string[];
  status: BookingStatus;
  source: BookingSource;
  createdAt: string;
  needsRecommendation?: boolean;
  reminder24Sent?: boolean;
  reminder24SentAt?: string;
  reminder2hSent?: boolean;
  reminder2hSentAt?: string;
}
