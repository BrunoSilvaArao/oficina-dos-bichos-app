"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Appointment, Product, getAllAppointments, storage } from "@/lib/storage";

function todayIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function AdminPage() {
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  function refreshAppointments() { setAppts(getAllAppointments()); }
  function refreshProducts() { setProducts(storage.products.get()); }

  useEffect(() => {
    refreshAppointments(); refreshProducts();
    window.addEventListener("odb-appointments-updated", refreshAppointments);
    window.addEventListener("odb-products-updated", refreshProducts);
    return () => {
      window.removeEventListener("odb-appointments-updated", refreshAppointments);
      window.removeEventListener("odb-products-updated", refreshProducts);
    };
  }, []);

  const active = appts.filter((a) => a.status !== "Cancelado");
  const today = todayIso();
  const todayAppointments = active.filter((a) => a.date === today);
  const baths = active.filter((a) => a.service === "Banho & Tosa").length;
  const hotel = active.filter((a) => a.service === "Hotelzinho").length;
  const lowStock = useMemo(() => products.filter((p) => p.active && p.stock <= 5), [products]);

  const menu = [
    ["Dashboard", "/admin", "🏠"],
    ["Agenda", "/admin/agenda", "📅"],
    ["Horários", "/admin/horarios", "🕐"],
    ["Produtos", "/admin/produtos", "🛍️"],
    ["Pets", "/pets", "🐾"],
    ["Loja do cliente", "/loja", "🛒"],
  ];

  return (
    <main className="min-h-screen bg-slate-50 p-5 md:p-8">
      <div className="mx-auto grid max-w-[1500px] gap-5 lg:grid-cols-[240px_1fr]">
        <aside className="card h-fit p-5 lg:sticky lg:top-5">
          <Link href="/" className="text-2xl font-black">🐾 Oficina dos Bichos</Link>
          <div className="mt-6 space-y-2">
            {menu.map(([label, href, icon], i) => (
              <Link href={href} key={label} className={`block rounded-xl px-4 py-3 font-bold ${i === 0 ? "bg-teal-100 text-teal-800" : "text-slate-600 hover:bg-slate-50"}`}>{icon} {label}</Link>
            ))}
            <div className="mt-2 border-t border-slate-100 pt-2">
              {["Clientes", "Financeiro", "Configurações"].map((x) => <div key={x} title="Entrará na próxima etapa" className="rounded-xl px-4 py-3 font-bold text-slate-400">{x} <span className="text-xs">• em breve</span></div>)}
            </div>
          </div>
        </aside>

        <section>
          <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div><h1 className="text-4xl font-black">Painel <span className="teal">Administrativo</span></h1><p className="muted">Agenda, disponibilidade e catálogo da clínica</p></div>
            <div className="flex flex-wrap gap-2"><Link href="/admin/horarios" className="rounded-xl bg-white px-4 py-3 font-black teal shadow-sm">🕐 Gerenciar horários</Link><Link href="/admin/produtos" className="primary px-4 py-3">🛍️ Gerenciar produtos</Link></div>
          </header>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[["📅", "Agendamentos hoje", String(todayAppointments.length)], ["🚿", "Banhos ativos", String(baths)], ["🏨", "Hospedagens ativas", String(hotel)], ["⚠️", "Produtos com estoque baixo", String(lowStock.length)]].map(([icon, label, value]) => <div className="card p-5" key={label}><div className="text-3xl">{icon}</div><p className="muted mt-2">{label}</p><p className="mt-1 text-3xl font-black">{value}</p></div>)}
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_.8fr]">
            <section className="card overflow-x-auto p-5">
              <div className="flex justify-between gap-3"><h2 className="section-title">Próximos atendimentos</h2><Link href="/admin/agenda" className="font-bold teal">Ver agenda completa ›</Link></div>
              <table className="mt-4 w-full min-w-[820px] text-left">
                <thead className="text-sm text-slate-500"><tr><th className="py-3">DATA</th><th>HORÁRIO</th><th>PET</th><th>SERVIÇO</th><th>PROFISSIONAL</th><th>STATUS</th></tr></thead>
                <tbody>{active.slice(0, 8).map((row) => <tr key={row.id} className="border-t border-slate-100"><td className="py-4">{row.date.split("-").reverse().join("/")}</td><td className="font-black teal">{row.time}</td><td className="font-bold">{row.pet}</td><td>{row.service}</td><td>{row.professionalName || "Equipe padrão"}</td><td><span className="pill">{row.status || "Agendado"}</span></td></tr>)}</tbody>
              </table>
            </section>

            <aside className="space-y-5">
              <section className="card p-5"><h2 className="section-title">Atalhos de gestão</h2><div className="mt-4 grid gap-3"><Link href="/admin/horarios" className="rounded-2xl bg-teal-50 p-4 font-black teal">🕐 Profissionais e horários <span className="float-right">›</span></Link><Link href="/admin/produtos" className="rounded-2xl bg-cyan-50 p-4 font-black text-cyan-800">🛍️ Produtos, preços e estoque <span className="float-right">›</span></Link><Link href="/admin/agenda" className="rounded-2xl bg-slate-50 p-4 font-black text-slate-700">📅 Atendimentos <span className="float-right">›</span></Link></div></section>
              <section className="card p-5"><div className="flex justify-between"><h2 className="section-title">Estoque baixo</h2><Link href="/admin/produtos" className="font-bold teal">Gerenciar</Link></div>{lowStock.length === 0 ? <p className="muted mt-3 text-sm">Nenhum produto com estoque baixo.</p> : <ul className="mt-3 space-y-3 text-sm">{lowStock.slice(0, 5).map((p) => <li key={p.slug}>{p.icon} {p.name} — <b className="text-red-500">{p.stock} unidades</b></li>)}</ul>}</section>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
