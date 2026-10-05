import { auth, getSession, isSupabaseConfigured, rpc, supabaseRest } from "@/lib/supabase-rest";
import { DEFAULT_PRODUCTS, DEFAULT_PROFESSIONALS, getAllAppointments, getAvailableTimes, getProfessionalsForService, isSlotOccupied, setAppointmentStatus, storage } from "@/lib/storage";

export type BackendProfile = {
  id: string;
  full_name: string;
  phone: string;
  city: string;
  role: "client" | "admin" | "staff";
};

export type BackendPet = {
  id: string;
  name: string;
  species: "Cachorro" | "Gato" | "Outro";
  breed: string;
  age: string;
  weight: string;
};

export type BackendService = {
  id: string;
  slug: string;
  name: string;
  sector: string;
  duration_minutes: number;
  active: boolean;
};

export type BackendProfessional = {
  id: string;
  slug?: string;
  name: string;
  role: string;
  sector: string;
  active: boolean;
  serviceIds: string[];
  services: string[];
};

export type BackendAppointment = {
  id: string;
  petId?: string;
  pet: string;
  serviceId?: string;
  service: string;
  date: string;
  time: string;
  tutor?: string;
  notes?: string;
  status: string;
  professionalId: string;
  professionalName: string;
  sector: string;
};

export type BackendAvailabilityRule = {
  id: string;
  professionalId: string;
  serviceId: string;
  service: string;
  times: string[];
  date?: string;
  weekday?: number;
  isClosed?: boolean;
  startTime?: string;
  endTime?: string;
};

export type BackendClinicException = {
  date: string;
  isClosed: boolean;
  note: string;
};

export type BackendOrderItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
};

export type BackendOrder = {
  id: string;
  clientId: string;
  clientName: string;
  phone: string;
  status: string;
  total: number;
  createdAt: string;
  paymentMethod: string;
  deliveryMethod: string;
  deliveryFee: number;
  address?: { street?: string; number?: string; neighborhood?: string; city?: string; cep?: string; complement?: string; reference?: string };
  items: BackendOrderItem[];
};

export type BackendProduct = {
  id?: string;
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

function cleanTime(value: string) {
  return value ? value.slice(0, 5) : value;
}

function mapAppointment(row: any): BackendAppointment {
  const pet = Array.isArray(row.pets) ? row.pets[0] : row.pets;
  const service = Array.isArray(row.services) ? row.services[0] : row.services;
  const professional = Array.isArray(row.professionals) ? row.professionals[0] : row.professionals;
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id: row.id,
    petId: row.pet_id,
    pet: pet?.name || row.pet_name || "Pet",
    serviceId: row.service_id,
    service: service?.name || row.service_name || "Atendimento",
    date: row.appointment_date,
    time: cleanTime(row.appointment_time),
    tutor: profile?.full_name || row.tutor_name || undefined,
    notes: row.notes || "",
    status: row.status === "scheduled" ? "Agendado" : row.status === "confirmed" ? "Confirmado" : row.status === "in_progress" ? "Em andamento" : row.status === "completed" ? "Concluído" : row.status === "cancelled" ? "Cancelado" : row.status,
    professionalId: row.professional_id,
    professionalName: professional?.name || "Profissional",
    sector: professional?.sector || service?.sector || "",
  };
}

const appointmentSelect = "id,client_id,pet_id,service_id,professional_id,appointment_date,appointment_time,notes,status,pets(name),services(name,sector),professionals(name,sector),profiles!appointments_client_id_fkey(full_name)";

function localProfile(): BackendProfile {
  const p = storage.profile.get();
  return { id: "local", full_name: p.name || "Cliente", phone: p.phone || "", city: p.city || "", role: "client" };
}

export const backend = {
  auth,
  configured: isSupabaseConfigured,

  async session() {
    return isSupabaseConfigured() ? getSession() : null;
  },

  async profile(): Promise<BackendProfile | null> {
    if (!isSupabaseConfigured()) return localProfile();
    const session = await getSession();
    if (!session) return null;
    const rows = await supabaseRest<any[]>(`profiles?id=eq.${encodeURIComponent(session.user.id)}&select=id,full_name,phone,city,role&limit=1`);
    return rows[0] || null;
  },

  async updateProfile(input: { full_name: string; phone: string; city: string }) {
    if (!isSupabaseConfigured()) {
      const current = storage.profile.get();
      storage.profile.set({ name: input.full_name, phone: input.phone, city: input.city, email: current.email || "" });
      return;
    }
    const session = await getSession();
    if (!session) throw new Error("Faça login para atualizar seu perfil.");
    await supabaseRest(`profiles?id=eq.${encodeURIComponent(session.user.id)}`, { method: "PATCH", body: input, prefer: "return=minimal" });
  },

  async pets(): Promise<BackendPet[]> {
    if (!isSupabaseConfigured()) return storage.pets.get().map((p) => ({ ...p }));
    const rows = await supabaseRest<any[]>("pets?select=id,name,species,breed,age_text,weight_text&active=eq.true&order=created_at.asc");
    return rows.map((p) => ({ id: p.id, name: p.name, species: p.species, breed: p.breed || "", age: p.age_text || "", weight: p.weight_text || "" }));
  },

  async addPet(input: Omit<BackendPet, "id">) {
    if (!isSupabaseConfigured()) {
      storage.pets.add({ id: String(Date.now()), ...input });
      return;
    }
    const session = await getSession();
    if (!session) throw new Error("Faça login para cadastrar um pet.");
    await supabaseRest("pets", {
      method: "POST",
      body: { owner_id: session.user.id, name: input.name, species: input.species, breed: input.breed, age_text: input.age, weight_text: input.weight },
      prefer: "return=minimal",
    });
  },

  async services(): Promise<BackendService[]> {
    if (!isSupabaseConfigured()) {
      const names = ["Veterinário", "Vacinação", "Banho & Tosa", "Hotelzinho", "Creche Pet"];
      return names.map((name, i) => ({ id: `local-service-${i}`, slug: name.toLowerCase().replace(/[^a-z0-9]+/gi, "-"), name, sector: name, duration_minutes: 60, active: true }));
    }
    return supabaseRest<BackendService[]>("services?select=id,slug,name,sector,duration_minutes,active&active=eq.true&order=name.asc", { authenticated: false });
  },

  async professionals(serviceId?: string, serviceName?: string): Promise<BackendProfessional[]> {
    if (!isSupabaseConfigured()) {
      const list = serviceName ? getProfessionalsForService(serviceName) : DEFAULT_PROFESSIONALS;
      return list.map((p) => ({ id: p.id, slug: p.id, name: p.name, role: p.role, sector: p.sector, active: p.active, serviceIds: [], services: p.services }));
    }
    const path = serviceId
      ? `professional_services?service_id=eq.${encodeURIComponent(serviceId)}&select=professional_id,professionals(id,slug,name,role_title,sector,active),services(id,name)&professionals.active=eq.true`
      : "professional_services?select=professional_id,professionals(id,slug,name,role_title,sector,active),services(id,name)";
    const rows = await supabaseRest<any[]>(path, { authenticated: false });
    const byId = new Map<string, BackendProfessional>();
    for (const row of rows) {
      const p = Array.isArray(row.professionals) ? row.professionals[0] : row.professionals;
      const s = Array.isArray(row.services) ? row.services[0] : row.services;
      if (!p || (serviceId && !p.active)) continue;
      const existing: BackendProfessional = byId.get(p.id) || { id: p.id, slug: p.slug, name: p.name, role: p.role_title || "Profissional", sector: p.sector || "", active: p.active, serviceIds: [], services: [] };
      if (s?.id && !existing.serviceIds.includes(s.id)) existing.serviceIds.push(s.id);
      if (s?.name && !existing.services.includes(s.name)) existing.services.push(s.name);
      byId.set(p.id, existing);
    }
    return [...byId.values()];
  },

  async availableTimes(date: string, serviceId: string, professionalId: string, serviceName?: string) {
    if (!isSupabaseConfigured()) {
      const name = serviceName || "Veterinário";
      return getAvailableTimes(date, name, professionalId).filter((time) => !isSlotOccupied(date, time, professionalId));
    }
    const rows = await rpc<any[]>("get_available_times", { p_service_id: serviceId, p_professional_id: professionalId, p_date: date }, false);
    return rows.map((r) => cleanTime(r.slot_time || r));
  },

  async myAppointments(): Promise<BackendAppointment[]> {
    if (!isSupabaseConfigured()) return getAllAppointments().filter((a) => !a.id.startsWith("demo-admin")).map((a) => ({ id: a.id, pet: a.pet, service: a.service, date: a.date, time: a.time, tutor: a.tutor, notes: a.notes, status: a.status || "Agendado", professionalId: a.professionalId || a.resourceId || "", professionalName: a.professionalName || "Profissional", sector: a.sector || "" }));
    const rows = await supabaseRest<any[]>(`appointments?select=${encodeURIComponent(appointmentSelect)}&order=appointment_date.asc,appointment_time.asc`);
    return rows.map(mapAppointment);
  },

  async adminAppointments(): Promise<BackendAppointment[]> {
    if (!isSupabaseConfigured()) return getAllAppointments().map((a) => ({ id: a.id, pet: a.pet, service: a.service, date: a.date, time: a.time, tutor: a.tutor, notes: a.notes, status: a.status || "Agendado", professionalId: a.professionalId || a.resourceId || "", professionalName: a.professionalName || "Profissional", sector: a.sector || "" }));
    const rows = await supabaseRest<any[]>(`appointments?select=${encodeURIComponent(appointmentSelect)}&order=appointment_date.asc,appointment_time.asc`);
    return rows.map(mapAppointment);
  },

  async bookAppointment(input: { petId: string; petName?: string; serviceId: string; serviceName?: string; professionalId: string; professionalName?: string; sector?: string; date: string; time: string; notes?: string }) {
    if (!isSupabaseConfigured()) {
      const latest = getAllAppointments();
      const conflict = latest.some((a) => a.status !== "Cancelado" && a.date === input.date && a.time === input.time && (a.professionalId || a.resourceId) === input.professionalId);
      if (conflict) throw new Error("Este horário acabou de ser ocupado. Escolha outro horário.");
      storage.appointments.add({ id: String(Date.now()), pet: input.petName || "Pet", service: input.serviceName || "Atendimento", date: input.date, time: input.time, tutor: storage.profile.get().name || "Cliente", notes: input.notes, status: "Agendado", resourceId: input.professionalId, professionalId: input.professionalId, professionalName: input.professionalName, sector: input.sector });
      return;
    }
    await rpc("book_appointment", {
      p_pet_id: input.petId,
      p_service_id: input.serviceId,
      p_professional_id: input.professionalId,
      p_date: input.date,
      p_time: input.time,
      p_notes: input.notes || null,
    });
  },

  async cancelMyAppointment(id: string) {
    if (!isSupabaseConfigured()) return setAppointmentStatus(id, "Cancelado");
    await rpc("cancel_my_appointment", { p_appointment_id: id });
  },

  async setAppointmentStatus(id: string, statusLabel: string) {
    if (!isSupabaseConfigured()) return setAppointmentStatus(id, statusLabel);
    const map: Record<string, string> = { "Agendado": "scheduled", "Confirmado": "confirmed", "Em andamento": "in_progress", "Concluído": "completed", "Cancelado": "cancelled" };
    const status = map[statusLabel] || statusLabel;
    await supabaseRest(`appointments?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: status === "cancelled" ? { status, cancelled_at: new Date().toISOString() } : { status }, prefer: "return=minimal" });
  },

  async adminRescheduleAppointment(id: string, date: string, time: string) {
    if (!isSupabaseConfigured()) return;
    await rpc("admin_reschedule_appointment", { p_appointment_id: id, p_date: date, p_time: time });
  },

  async availabilityRules(): Promise<BackendAvailabilityRule[]> {
    if (!isSupabaseConfigured()) return storage.availability.get().map((r) => ({ id: r.id, professionalId: r.professionalId, serviceId: r.service, service: r.service, times: r.times, date: r.date, weekday: r.weekday, isClosed: r.times.length === 0 }));
    const rows = await supabaseRest<any[]>("availability_rules?select=id,professional_id,service_id,specific_date,weekday,times,is_closed,start_time,end_time,services(name)&order=specific_date.desc.nullslast,weekday.asc");
    return rows.map((r) => ({
      id: r.id,
      professionalId: r.professional_id,
      serviceId: r.service_id,
      service: (Array.isArray(r.services) ? r.services[0]?.name : r.services?.name) || "Serviço",
      times: (r.times || []).map(cleanTime),
      date: r.specific_date || undefined,
      weekday: r.weekday ?? undefined,
      isClosed: Boolean(r.is_closed),
      startTime: cleanTime(r.start_time || ""),
      endTime: cleanTime(r.end_time || ""),
    }));
  },

  async saveAvailabilityWindow(rule: { professionalId: string; serviceId: string; date?: string; weekday?: number; startTime?: string; endTime?: string; isClosed?: boolean }) {
    if (!isSupabaseConfigured()) return;
    await rpc("upsert_availability_window", {
      p_professional_id: rule.professionalId,
      p_service_id: rule.serviceId,
      p_specific_date: rule.date || null,
      p_weekday: rule.date ? null : rule.weekday ?? null,
      p_start_time: rule.isClosed ? null : rule.startTime || null,
      p_end_time: rule.isClosed ? null : rule.endTime || null,
      p_is_closed: Boolean(rule.isClosed),
    });
  },

  async clinicExceptions(): Promise<BackendClinicException[]> {
    if (!isSupabaseConfigured()) return [];
    const rows = await supabaseRest<any[]>("clinic_date_exceptions?select=specific_date,is_closed,note&order=specific_date.asc");
    return rows.map((r) => ({ date: r.specific_date, isClosed: Boolean(r.is_closed), note: r.note || "" }));
  },

  async setClinicException(date: string, isClosed: boolean, note = "") {
    if (!isSupabaseConfigured()) return;
    await rpc("set_clinic_date_exception", { p_date: date, p_is_closed: isClosed, p_note: note });
  },

  async removeClinicException(date: string) {
    if (!isSupabaseConfigured()) return;
    await supabaseRest(`clinic_date_exceptions?specific_date=eq.${encodeURIComponent(date)}`, { method: "DELETE", prefer: "return=minimal" });
  },

  async saveAvailabilityRule(rule: { professionalId: string; serviceId: string; serviceName?: string; date: string; weekday?: number; times: string[]; weekly: boolean }) {
    if (!isSupabaseConfigured()) {
      const current = storage.availability.get();
      const service = rule.serviceName || rule.serviceId;
      const nextRule = { id: String(Date.now()), professionalId: rule.professionalId, service, times: rule.times, ...(rule.weekly ? { weekday: rule.weekday } : { date: rule.date }) };
      const filtered = current.filter((existing) => {
        if (existing.professionalId !== rule.professionalId || existing.service !== service) return true;
        return rule.weekly ? existing.weekday !== rule.weekday || Boolean(existing.date) : existing.date !== rule.date;
      });
      storage.availability.set([...filtered, nextRule]);
      return;
    }
    await rpc("upsert_availability_rule", {
      p_professional_id: rule.professionalId,
      p_service_id: rule.serviceId,
      p_specific_date: rule.weekly ? null : rule.date,
      p_weekday: rule.weekly ? rule.weekday ?? null : null,
      p_times: rule.times,
      p_is_closed: rule.times.length === 0,
    });
  },

  async removeAvailabilityRule(id: string) {
    if (!isSupabaseConfigured()) {
      storage.availability.set(storage.availability.get().filter((r) => r.id !== id));
      return;
    }
    await supabaseRest(`availability_rules?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", prefer: "return=minimal" });
  },

  async addProfessional(input: { name: string; role: string; sector: string; serviceIds: string[]; serviceNames?: string[] }) {
    if (!isSupabaseConfigured()) {
      storage.professionals.set([...storage.professionals.get(), { id: `prof-${Date.now()}`, name: input.name, role: input.role, sector: input.sector, services: input.serviceNames || input.serviceIds, active: true }]);
      return;
    }
    await rpc("create_professional_with_services", { p_name: input.name, p_role_title: input.role, p_sector: input.sector, p_service_ids: input.serviceIds });
  },

  async updateServiceDuration(id: string, durationMinutes: number) {
    if (!isSupabaseConfigured()) return;
    await supabaseRest(`services?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: { duration_minutes: durationMinutes }, prefer: "return=minimal" });
  },

  async toggleProfessional(id: string, active: boolean) {
    if (!isSupabaseConfigured()) {
      storage.professionals.set(storage.professionals.get().map((p) => p.id === id ? { ...p, active } : p));
      return;
    }
    await supabaseRest(`professionals?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: { active }, prefer: "return=minimal" });
  },

  async products(includeInactive = false): Promise<BackendProduct[]> {
    if (!isSupabaseConfigured()) return (storage.products.get() || DEFAULT_PRODUCTS).filter((p) => includeInactive || p.active).map((p) => ({ ...p }));
    const filter = includeInactive ? "" : "&active=eq.true";
    const rows = await supabaseRest<any[]>(`products?select=id,slug,name,price,category,stock,icon,image_url,description,active${filter}&order=name.asc`, { authenticated: includeInactive });
    return rows.map((p) => ({ id: p.id, slug: p.slug, name: p.name, price: Number(p.price), category: p.category || "Outros", stock: p.stock || 0, icon: p.icon || "🐾", image: p.image_url || undefined, description: p.description || "", active: Boolean(p.active) }));
  },

  async saveProduct(product: BackendProduct) {
    if (!isSupabaseConfigured()) {
      const current = storage.products.get();
      const exists = current.some((p) => p.slug === product.slug);
      storage.products.set(exists ? current.map((p) => p.slug === product.slug ? { ...product } : p) : [...current, { ...product }]);
      return;
    }
    const body = { slug: product.slug, name: product.name, price: product.price, category: product.category, stock: product.stock, icon: product.icon, image_url: product.image || null, description: product.description, active: product.active };
    await supabaseRest("products?on_conflict=slug", { method: "POST", body, prefer: "resolution=merge-duplicates,return=minimal" });
  },

  async deleteProduct(idOrSlug: string) {
    if (!isSupabaseConfigured()) {
      storage.products.set(storage.products.get().filter((p) => p.slug !== idOrSlug));
      return;
    }
    const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idOrSlug);
    const field = looksLikeUuid ? "id" : "slug";
    await supabaseRest(`products?${field}=eq.${encodeURIComponent(idOrSlug)}`, { method: "DELETE", prefer: "return=minimal" });
  },

  async placeOrder(items: Array<{ slug: string; quantity: number }>, delivery: string, payment: string, address?: { street: string; number: string; neighborhood: string; city: string; cep: string; complement?: string; reference?: string }) {
    if (!isSupabaseConfigured()) return { id: `demo-${Date.now()}` };
    return rpc<any>("place_order", {
      p_items: items,
      p_delivery_method: delivery,
      p_payment_method: payment,
      p_address: address || {},
    });
  },

  async adminOrders(): Promise<BackendOrder[]> {
    if (!isSupabaseConfigured()) return [];
    const select = "id,client_id,status,total,created_at,payment_method,delivery_method,delivery_fee,delivery_street,delivery_number,delivery_neighborhood,delivery_city,delivery_cep,delivery_complement,delivery_reference,profiles!orders_client_id_fkey(full_name,phone),order_items(id,product_id,quantity,unit_price,products(name))";
    const rows = await supabaseRest<any[]>(`orders?select=${encodeURIComponent(select)}&order=created_at.desc`);
    return rows.map((r) => {
      const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
      return {
        id: r.id, clientId: r.client_id, clientName: profile?.full_name || "Cliente", phone: profile?.phone || "",
        status: r.status, total: Number(r.total || 0), createdAt: r.created_at, paymentMethod: r.payment_method || "—", deliveryMethod: r.delivery_method || "retirada", deliveryFee: Number(r.delivery_fee || 0),
        address: r.delivery_method === "entrega" ? { street: r.delivery_street || "", number: r.delivery_number || "", neighborhood: r.delivery_neighborhood || "", city: r.delivery_city || "", cep: r.delivery_cep || "", complement: r.delivery_complement || "", reference: r.delivery_reference || "" } : undefined,
        items: (r.order_items || []).map((i: any) => ({ id: i.id, productId: i.product_id, productName: (Array.isArray(i.products) ? i.products[0]?.name : i.products?.name) || "Produto", quantity: i.quantity, unitPrice: Number(i.unit_price || 0) })),
      };
    });
  },

  async updateOrderStatus(id: string, status: string) {
    if (!isSupabaseConfigured()) return;
    await supabaseRest(`orders?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: { status }, prefer: "return=minimal" });
  },
};
