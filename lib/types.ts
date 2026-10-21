export type Role = "owner" | "receptionist" | "stylist";
export type Profile = { id: string; name: string; role: Role; active: boolean };
export type Service = {
  id: string;
  name: string;
  category: string;
  price: number;
  duration: number;
  active: boolean;
};
export type Client = { id: string; name: string; phone: string };
export type Appointment = {
  id: string;
  client_id: string;
  service_id: string;
  service_name: string;
  staff_id: string;
  starts_at: string;
  ends_at: string;
  total: number;
  status: "Confirmed" | "Completed" | "Cancelled";
  request_id: string | null;
};
export type Payment = {
  id: string;
  appointment_id: string;
  amount: number;
  method: string;
  recorded_by: string;
  created_at: string;
};
export type BookingRequest = {
  id: string;
  name: string;
  phone: string;
  service_id: string;
  preferred_date: string;
  preferred_time: string;
  notes: string;
  status: "Pending" | "Booked" | "Declined";
  created_at: string;
};
export type ContactMessage = {
  id: string;
  name: string;
  phone: string;
  message: string;
  status: "New" | "Handled";
  created_at: string;
};
export type PortalData = {
  messages: ContactMessage[];
  profile: Profile;
  team: Profile[];
  services: Service[];
  clients: Client[];
  appointments: Appointment[];
  payments: Payment[];
  requests: BookingRequest[];
};
export const money = (n: number) => "Rs. " + n.toLocaleString("en-PK");
export const day = (value: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
export const clock = (value: string) =>
  new Intl.DateTimeFormat("en-PK", {
    timeZone: "Asia/Karachi",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
export const sampleServices: Service[] = [
  {
    id: "bridal",
    name: "Bridal Makeup",
    category: "Makeup",
    price: 35000,
    duration: 180,
    active: true,
  },
  {
    id: "party",
    name: "Party Makeup",
    category: "Makeup",
    price: 12000,
    duration: 90,
    active: true,
  },
  {
    id: "hair",
    name: "Haircut & Blowdry",
    category: "Hair",
    price: 3500,
    duration: 60,
    active: true,
  },
  {
    id: "skin",
    name: "Glow Facial",
    category: "Skin",
    price: 5500,
    duration: 60,
    active: true,
  },
  {
    id: "nails",
    name: "Manicure & Pedicure",
    category: "Nails",
    price: 4500,
    duration: 60,
    active: true,
  },
];
