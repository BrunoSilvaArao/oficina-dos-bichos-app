export type Appointment = {
  id: string;
  pet: string;
  service: string;
  date: string;
  time: string;
  tutor?: string;
  notes?: string;
  status?: string;
  resourceId?: string;
  professionalId?: string;
  professionalName?: string;
  sector?: string;
};

export type Pet = {
  id: string;
  name: string;
  species: "Cachorro" | "Gato" | "Outro";
  breed: string;
  age: string;
  weight: string;
};

export type CartItem = {
  slug: string;
  name: string;
  price: number;
  icon: string;
  qty: number;
};

export type Professional = {
  id: string;
  name: string;
  role: string;
  sector: string;
  services: string[];
  active: boolean;
};

export type AvailabilityRule = {
  id: string;
  professionalId: string;
  service: string;
  times: string[];
  date?: string;
  weekday?: number;
};

export type Product = {
  slug: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  icon: string;
  image?: string;
  description: string;
  active: boolean;
};

const APPOINTMENTS = "odb_appointments";
const APPOINTMENT_STATUS = "odb_appointment_status";
const PETS = "odb_pets";
const CART = "odb_cart";
const PROFILE = "odb_profile";
const PROFESSIONALS = "odb_professionals";
const AVAILABILITY = "odb_availability";
const PRODUCTS = "odb_products";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(value));
}

function emit(name: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(name));
}

export const DEFAULT_PROFESSIONALS: Professional[] = [
  {
    id: "vet-john",
    name: "Dr. John Dale Neto",
    role: "Médico-veterinário",
    sector: "Clínica veterinária",
    services: ["Veterinário", "Vacinação"],
    active: true,
  },
  {
    id: "banho-equipe",
    name: "Equipe Banho & Tosa",
    role: "Banho & Tosa",
    sector: "Estética",
    services: ["Banho & Tosa"],
    active: true,
  },
  {
    id: "hotel-equipe",
    name: "Equipe Hotelzinho",
    role: "Cuidados e hospedagem",
    sector: "Hotelzinho",
    services: ["Hotelzinho"],
    active: true,
  },
  {
    id: "creche-equipe",
    name: "Equipe Creche Pet",
    role: "Cuidados e recreação",
    sector: "Creche Pet",
    services: ["Creche Pet"],
    active: true,
  },
];

const DEFAULT_TIMES = ["08:00", "09:00", "10:30", "14:00", "16:00", "17:30"];

export const DEFAULT_AVAILABILITY: AvailabilityRule[] = DEFAULT_PROFESSIONALS.flatMap((p) =>
  [1, 2, 3, 4, 5, 6].flatMap((weekday) =>
    p.services.map((service) => ({
      id: `default-${p.id}-${service}-${weekday}`,
      professionalId: p.id,
      service,
      weekday,
      times: DEFAULT_TIMES,
    }))
  )
);

export const DEFAULT_PRODUCTS: Product[] = [
  {
    slug: "racao-premium-10kg",
    icon: "🥣",
    name: "Ração Premium 10kg",
    price: 129.9,
    category: "Rações",
    stock: 12,
    description: "Ração completa e balanceada para cães adultos, com nutrientes para saúde, energia e pelagem.",
    active: true,
  },
  {
    slug: "brinquedo-mordedor",
    icon: "🧸",
    name: "Brinquedo Mordedor",
    price: 24.9,
    category: "Brinquedos",
    stock: 8,
    description: "Brinquedo resistente para enriquecer a rotina e estimular seu pet.",
    active: true,
  },
  {
    slug: "coleira-ajustavel",
    icon: "🦴",
    name: "Coleira Ajustável",
    price: 39.9,
    category: "Acessórios",
    stock: 6,
    description: "Coleira confortável, ajustável e indicada para passeios do dia a dia.",
    active: true,
  },
  {
    slug: "shampoo-pet-500ml",
    icon: "🧴",
    name: "Shampoo Pet 500ml",
    price: 32.9,
    category: "Farmácia",
    stock: 5,
    description: "Higiene suave para pele e pelagem, com fragrância agradável.",
    active: true,
  },
];

export const storage = {
  appointments: {
    get: () => read<Appointment[]>(APPOINTMENTS, []),
    set: (items: Appointment[]) => {
      write(APPOINTMENTS, items);
      emit("odb-appointments-updated");
    },
    add: (item: Appointment) => {
      write(APPOINTMENTS, [...read<Appointment[]>(APPOINTMENTS, []), item]);
      emit("odb-appointments-updated");
    },
  },
  appointmentStatus: {
    get: () => read<Record<string, string>>(APPOINTMENT_STATUS, {}),
    set: (map: Record<string, string>) => {
      write(APPOINTMENT_STATUS, map);
      emit("odb-appointments-updated");
    },
  },
  pets: {
    get: () => read<Pet[]>(PETS, []),
    set: (items: Pet[]) => write(PETS, items),
    add: (item: Pet) => write(PETS, [...read<Pet[]>(PETS, []), item]),
  },
  cart: {
    get: () => read<CartItem[]>(CART, []),
    set: (items: CartItem[]) => {
      write(CART, items);
      emit("odb-cart-updated");
    },
    add: (item: Omit<CartItem, "qty">) => {
      const cart = read<CartItem[]>(CART, []);
      const found = cart.find((x) => x.slug === item.slug);
      const next = found
        ? cart.map((x) => (x.slug === item.slug ? { ...x, qty: x.qty + 1 } : x))
        : [...cart, { ...item, qty: 1 }];
      write(CART, next);
      emit("odb-cart-updated");
    },
  },
  profile: {
    get: () => read(PROFILE, {
      name: "Cliente",
      phone: "",
      email: "",
      city: "",
    }),
    set: (profile: { name: string; phone: string; email: string; city: string }) => write(PROFILE, profile),
  },
  professionals: {
    get: () => read<Professional[]>(PROFESSIONALS, DEFAULT_PROFESSIONALS),
    set: (items: Professional[]) => {
      write(PROFESSIONALS, items);
      emit("odb-schedule-updated");
    },
  },
  availability: {
    get: () => read<AvailabilityRule[]>(AVAILABILITY, []),
    set: (items: AvailabilityRule[]) => {
      write(AVAILABILITY, items);
      emit("odb-schedule-updated");
    },
  },
  products: {
    get: () => read<Product[]>(PRODUCTS, DEFAULT_PRODUCTS),
    set: (items: Product[]) => {
      write(PRODUCTS, items);
      emit("odb-products-updated");
    },
  },
};

export const DEMO_APPOINTMENTS: Appointment[] = [
  {
    id: "demo-admin-1",
    date: "2026-09-30",
    time: "09:00",
    pet: "Thor",
    tutor: "Ana Paula",
    service: "Veterinário",
    status: "Confirmado",
    resourceId: "vet-john",
    professionalId: "vet-john",
    professionalName: "Dr. John Dale Neto",
    sector: "Clínica veterinária",
  },
  {
    id: "demo-admin-2",
    date: "2026-09-30",
    time: "10:30",
    pet: "Luna",
    tutor: "Carlos Mendes",
    service: "Banho & Tosa",
    status: "Em andamento",
    resourceId: "banho-equipe",
    professionalId: "banho-equipe",
    professionalName: "Equipe Banho & Tosa",
    sector: "Estética",
  },
  {
    id: "demo-client-1",
    pet: "Thor",
    service: "Veterinário",
    date: "2026-10-06",
    time: "10:30",
    status: "Agendado",
    resourceId: "vet-john",
    professionalId: "vet-john",
    professionalName: "Dr. John Dale Neto",
    sector: "Clínica veterinária",
  },
  {
    id: "demo-client-2",
    pet: "Luna",
    service: "Banho & Tosa",
    date: "2026-10-07",
    time: "14:00",
    status: "Agendado",
    resourceId: "banho-equipe",
    professionalId: "banho-equipe",
    professionalName: "Equipe Banho & Tosa",
    sector: "Estética",
  },
];

export function sortAppointments(items: Appointment[]) {
  return [...items].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
}

export function getAllAppointments() {
  const overrides = storage.appointmentStatus.get();
  const apply = (item: Appointment): Appointment => ({ ...item, status: overrides[item.id] || item.status });
  return sortAppointments([...storage.appointments.get().map(apply), ...DEMO_APPOINTMENTS.map(apply)]);
}

export function setAppointmentStatus(id: string, status: string) {
  const userItems = storage.appointments.get();
  const userIndex = userItems.findIndex((item) => item.id === id);
  if (userIndex >= 0) {
    const next = userItems.map((item) => item.id === id ? { ...item, status } : item);
    storage.appointments.set(next);
    return;
  }
  const overrides = storage.appointmentStatus.get();
  storage.appointmentStatus.set({ ...overrides, [id]: status });
}

export function isSlotOccupied(
  date: string,
  time: string,
  resourceId: string,
  items: Appointment[] = getAllAppointments(),
  ignoreAppointmentId?: string,
) {
  return items.some((item) => {
    if (ignoreAppointmentId && item.id === ignoreAppointmentId) return false;
    if (item.status === "Cancelado") return false;
    const itemResource = item.resourceId || inferResourceId(item.service);
    return item.date === date && item.time === time && itemResource === resourceId;
  });
}

export function inferResourceId(service: string) {
  if (service === "Banho & Tosa") return "banho-equipe";
  if (service === "Hotelzinho") return "hotel-equipe";
  if (service === "Creche Pet") return "creche-equipe";
  return "vet-john";
}

export function getProfessionalsForService(service: string) {
  return storage.professionals.get().filter((p) => p.active && p.services.includes(service));
}

export function getAvailableTimes(date: string, service: string, professionalId: string) {
  if (!date || !professionalId) return [];
  const custom = storage.availability.get();
  const dateSpecific = custom.filter(
    (rule) => rule.professionalId === professionalId && rule.service === service && rule.date === date,
  );
  if (dateSpecific.length) {
    return Array.from(new Set(dateSpecific.flatMap((rule) => rule.times))).sort();
  }

  const weekday = new Date(`${date}T12:00:00`).getDay();
  const customWeekly = custom.filter(
    (rule) => rule.professionalId === professionalId && rule.service === service && rule.weekday === weekday && !rule.date,
  );
  if (customWeekly.length) {
    return Array.from(new Set(customWeekly.flatMap((rule) => rule.times))).sort();
  }

  const defaults = DEFAULT_AVAILABILITY.filter(
    (rule) => rule.professionalId === professionalId && rule.service === service && rule.weekday === weekday,
  );
  return Array.from(new Set(defaults.flatMap((rule) => rule.times))).sort();
}

export function slugifyProduct(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
