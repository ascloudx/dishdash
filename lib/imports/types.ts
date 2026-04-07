export interface ImportedBooking {
  id: string;
  client_name: string;
  phone?: string;
  date: string;
  time: string;
  price: number;
  service: string;
  notes?: string;
}

export interface ImportedClient {
  id: string;
  name: string;
  phone?: string;
  total_visits: number;
  total_spent: number;
  last_visit: string;
  preferred_time?: string;
}

export interface ImportInsight {
  type: "gap" | "client" | "pricing" | "service";
  priority: "high" | "medium" | "low";
  message: string;
  action: string;
}

export interface ImportResult {
  bookings: ImportedBooking[];
  clients: ImportedClient[];
  insights: ImportInsight[];
  timeFrequency: Record<string, number>;
  priceFrequency: Record<string, number>;
  repeatClients: number;
}
