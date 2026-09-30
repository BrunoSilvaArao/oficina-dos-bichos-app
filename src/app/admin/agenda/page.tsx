"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Appointment, getAllAppointments, setAppointmentStatus } from "@/lib/storage";

export default function AdminAgenda() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [dateFilter, setDateFilter] = useState("");
  const [message, setMessage] = useState("");

  function refresh() {
    setItems(getAllAppointments());
  }

  useEffect(() => {
    refresh();
    window.addEventListener("odb-appointments-updated", refresh);
    return () => window.removeEventListener("odb-appointments-updated", refresh);
  }, []);

  const visible = useMemo(
    () => dateFilter ? items.filter((x) => x.date === dateFilter) : items,
    [items, dateFilter]
  );

  function status(id: string, nextStatus: string) {
    setAppointmentStatus(id, nextStatus);
    refresh();
    if (nextStatus === "Cancelado") {
      setMessage("Agendamento cancelado. O horário foi liberado novamente para o mesmo profissional/equipe.");
      window.setTimeout(() => setMessage(""), 3500);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Link href="/admin" className="font-bold teal">‹ Dashboard</Link>
            <h1 className="mt-2 text-4xl font-black">Agenda <span className="teal">administrativa</span></h1>
            <p className="mt-1 text-slate-500">Cada profissional/equipe possui sua própria ocupação de horário.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3" />
            {dateFilter && <button onClick={() => setDateFilter("")} className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold">Limpar data</button>}
            <Link href="/admin/horarios" className="rounded-xl border border-teal-200 bg-white px-5 py-3 font-black teal">⚙ Horários disponíveis</Link>
            <Link href={dateFilter ? `/agenda/novo?data=${dateFilter}` : "/agenda/novo"} className="primary px-5 py-3">＋ Novo agendamento</Link>
          </div>
        </div>

        {message && <div className="mt-4 rounded-2xl bg-green-50 p-4 font-bold text-green-700">✓ {message}</div>}

        <div className="card mt-5 overflow-x-auto p-5">
          {visible.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-4xl">📅</div>
              <h2 className="mt-3 text-xl font-black">Nenhum agendamento nesta data</h2>
              <p className="mt-1 text-slate-500">Selecione outra data ou crie um novo horário.</p>
            </div>
          ) : (
            <table className="w-full min-w-[1100px] text-left">
              <thead><tr className="text-sm text-slate-500"><th className="py-3">DATA</th><th>HORÁRIO</th><th>PET</th><th>TUTOR</th><th>SERVIÇO</th><th>PROFISSIONAL / EQUIPE</th><th>SETOR</th><th>STATUS</th><th>AÇÃO</th></tr></thead>
              <tbody>
                {visible.map((x) => (
                  <tr key={x.id} className={`border-t ${x.status === "Cancelado" ? "bg-slate-50 text-slate-400" : ""}`}>
                    <td className="py-4">{x.date.split("-").reverse().join("/")}</td>
                    <td className="font-black teal">{x.time}</td>
                    <td className="font-bold">{x.pet}</td>
                    <td>{x.tutor || "Cliente"}</td>
                    <td>{x.service}</td>
                    <td>{x.professionalName || "Equipe padrão"}</td>
                    <td>{x.sector || "Clínica"}</td>
                    <td><span className="pill">{x.status || "Agendado"}</span></td>
                    <td>
                      <select value={x.status || "Agendado"} onChange={(e) => status(x.id, e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700">
                        <option>Agendado</option><option>Confirmado</option><option>Em andamento</option><option>Concluído</option><option>Cancelado</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
