export interface Service {
  id:
    | "signature"
    | "luxe"
    | "bridal"
    | "gel_extensions"
    | "acrylic_extensions"
    | "shellac"
    | "combo"
    | "consultation";
  name: string;
  price: number;
  duration: number;
  active: boolean;
}

export const SERVICES: Service[] = [
  { id: "signature", name: "Signature Set", price: 65, duration: 75, active: true },
  { id: "luxe", name: "Luxe Set", price: 85, duration: 90, active: true },
  { id: "bridal", name: "Bridal Set", price: 110, duration: 120, active: true },
  { id: "gel_extensions", name: "Gel Extensions", price: 49, duration: 60, active: true },
  { id: "acrylic_extensions", name: "Acrylic Extensions", price: 49, duration: 90, active: true },
  { id: "shellac", name: "Shellac (Hands & Toes)", price: 49, duration: 75, active: true },
  { id: "combo", name: "Combo Special", price: 59, duration: 75, active: true },
  { id: "consultation", name: "Not Sure / Need Help", price: 0, duration: 30, active: true },
];

const SERVICE_ALIASES: Record<string, Service["id"]> = {
  "signature set": "signature",
  "signature set most booked": "signature",
  "luxe set": "luxe",
  "luxe nail set": "luxe",
  "luxe nail art": "luxe",
  "bridal set": "bridal",
  "bridal nail set": "bridal",
  "bridal package": "bridal",
  "gel extension": "gel_extensions",
  "gel extensions": "gel_extensions",
  "acrylic extension": "acrylic_extensions",
  "acrylic extensions": "acrylic_extensions",
  "acrylic full set": "acrylic_extensions",
  "shellac hands toes": "shellac",
  "shellac hands & toes": "shellac",
  "shellac (hands & toes)": "shellac",
  "combo special": "combo",
  "combo special acrylic or gel extensions + shellac toes": "combo",
  "combo special acrylic or gel extensions + shellac toes save $10": "combo",
  "not sure / need help": "consultation",
  "other / not sure": "consultation",
  consultation: "consultation",
};

export type ServiceId = Service["id"];

export function getServices() {
  return SERVICES;
}

export function getActiveServices() {
  return SERVICES.filter((service) => service.active);
}

export function getServiceById(serviceId: string) {
  return SERVICES.find((service) => service.id === serviceId) ?? null;
}

function normalizeServiceLabel(service: string) {
  return service
    .replace(/\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu, "")
    .replace(/\([^)]*\)/g, (match) => ` ${match} `)
    .replace(/[-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function matchServiceId(input: string): ServiceId | null {
  const normalized = normalizeServiceLabel(input);

  if (!normalized) {
    return null;
  }

  if (normalized in SERVICE_ALIASES) {
    return SERVICE_ALIASES[normalized];
  }

  const service = SERVICES.find(
    (candidate) =>
      candidate.id === normalized ||
      normalizeServiceLabel(candidate.name) === normalized
  );

  return service?.id ?? null;
}

export function getServiceByInput(input: string) {
  const serviceId = matchServiceId(input);
  return serviceId ? getServiceById(serviceId) : null;
}
