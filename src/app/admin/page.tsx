"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { backend, BackendAppointment, BackendOrder, BackendProduct } from "@/lib/backend";

function todayIso() { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`; }

export default function AdminPage() {
  const [appts, setAppts] = useState<BackendAppointment[]>([]);
  const [products, setProducts] = useState<BackendProduct[]>([]);
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      if (backend.configured()) {
        if (!(await backend.session())) { window.location.href = "/login"; return; }
        const profile = await backend.profile();
        if (!profile || profile.role === "client") { window.location.href = "/"; return; }
      }
      const [a, p, o] = await Promise.all([backend.adminAppointments(), backend.products(true), backend.adminOrders()]);
      setAppts(a); setProducts(p); setOrders(o);
    })().catch((err) => setError(err instanceof Error ? err.message : "Não foi possível carregar o painel."))
      .finally(() => setLoading(false));
  }, []);

  const active = appts.filter((a) => a.status !== "Cancelado");
  const todayAppointments = active.filter((a) => a.date === todayIso());
  const baths = active.filter((a) => a.service === "Banho & Tosa").length;
  const hotel = active.filter((a) => a.service === "Hotelzinho").length;
  const lowStock = useMemo(() => products.filter((p) => p.active && p.stock <= 5), [products]);
  const openOrders = orders.filter((o) => !["completed","cancelled"].includes(o.status)).length;
  const menu = [["Dashboard","/admin","🏠"],["Agenda","/admin/agenda","📅"],["Horários","/admin/horarios","🕐"],["Pedidos","/admin/pedidos","📦"],["Produtos","/admin/produtos","🛍️"],["Loja do cliente","/loja","🛒"]];

  return (
    <main className="min-h-screen bg-slate-50 p-5 md:p-8">
      <div className="mx-auto grid max-w-[1500px] gap-5 lg:grid-cols-[240px_1fr]">
        <aside className="card h-fit p-5 lg:sticky lg:top-5"><Link href="/" className="text-2xl font-black">🐾 Oficina dos Bichos</Link><div className="mt-6 space-y-2">{menu.map(([label,href,icon],i)=><Link href={href} key={label} className={`block rounded-xl px-4 py-3 font-bold ${i===0?"bg-teal-100 text-teal-800":"text-slate-600 hover:bg-slate-50"}`}>{icon} {label}</Link>)}</div></aside>
        <section>
          <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div><h1 className="text-4xl font-black">Painel <span className="teal">Administrativo</span></h1><p className="muted">Agenda, disponibilidade, pedidos e catálogo da clínica</p></div><div className="flex flex-wrap gap-2"><Link href="/admin/horarios" className="rounded-xl bg-white px-4 py-3 font-black teal shadow-sm">🕐 Gerenciar horários</Link><Link href="/admin/pedidos" className="rounded-xl bg-white px-4 py-3 font-black teal shadow-sm">📦 Ver pedidos</Link><Link href="/admin/produtos" className="primary px-4 py-3">🛍️ Gerenciar produtos</Link></div></header>
          {error && <div className="mt-4 rounded-2xl bg-red-50 p-4 font-bold text-red-700">⚠ {error}</div>}
          {loading && <div className="card mt-5 p-5 font-bold">Carregando dados da clínica...</div>}
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["📅","Agendamentos hoje",String(todayAppointments.length)],["📦","Pedidos em andamento",String(openOrders)],["🏨","Hospedagens ativas",String(hotel)],["⚠️","Produtos com estoque baixo",String(lowStock.length)]].map(([icon,label,value])=><div className="card p-5" key={label}><div className="text-3xl">{icon}</div><p className="muted mt-2">{label}</p><p className="mt-1 text-3xl font-black">{value}</p></div>)}</div>
          <section className="card mt-5 overflow-x-auto p-5"><div className="flex justify-between gap-3"><h2 className="section-title">Próximos atendimentos</h2><Link href="/admin/agenda" className="font-bold teal">Ver agenda completa ›</Link></div><table className="mt-4 w-full min-w-[820px] text-left"><thead className="text-sm text-slate-500"><tr><th className="py-3">DATA</th><th>HORÁRIO</th><th>PET</th><th>TUTOR</th><th>SERVIÇO</th><th>PROFISSIONAL</th><th>STATUS</th></tr></thead><tbody>{active.slice(0,10).map((row)=><tr key={row.id} className="border-t border-slate-100"><td className="py-4">{row.date.split("-").reverse().join("/")}</td><td className="font-black teal">{row.time}</td><td className="font-bold">{row.pet}</td><td>{row.tutor||"—"}</td><td>{row.service}</td><td>{row.professionalName}</td><td><span className="pill">{row.status}</span></td></tr>)}</tbody></table></section>
        </section>
      </div>
    </main>
  );
}
