"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import BrandHeader from "@/components/BrandHeader";
import MobilePage from "@/components/MobilePage";
import { Appointment, getAllAppointments, setAppointmentStatus } from "@/lib/storage";

const weekdays = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function dateToIso(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isoToDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default function AgendaClient() {
  const search = useSearchParams();
  const initialIso = search.get("data") || dateToIso(new Date());
  const initialDate = isoToDate(initialIso);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [view, setView] = useState("Mês");
  const [selectedDate, setSelectedDate] = useState(initialIso);
  const [monthDate, setMonthDate] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
  const [message, setMessage] = useState("");

  function refresh() {
    setAppointments(getAllAppointments().filter((item) => !item.id.startsWith("demo-admin")));
  }

  useEffect(() => {
    refresh();
    window.addEventListener("odb-appointments-updated", refresh);
    return () => window.removeEventListener("odb-appointments-updated", refresh);
  }, []);

  useEffect(() => {
    const queryDate = search.get("data");
    if (!queryDate) return;
    const d = isoToDate(queryDate);
    setSelectedDate(queryDate);
    setMonthDate(new Date(d.getFullYear(), d.getMonth(), 1));
  }, [search]);

  const selectedAppointments = useMemo(
    () => appointments.filter((a) => a.date === selectedDate && a.status !== "Cancelado"),
    [appointments, selectedDate]
  );

  const appointmentDates = useMemo(
    () => new Set(appointments.filter((a) => a.status !== "Cancelado").map((a) => a.date)),
    [appointments]
  );

  const calendarCells = useMemo(() => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ day: number; iso: string } | null> = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      cells.push({ day, iso });
    }
    return cells;
  }, [monthDate]);

  function selectToday() {
    const today = new Date();
    const iso = dateToIso(today);
    setSelectedDate(iso);
    setMonthDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setView("Hoje");
  }

  function previousMonth() {
    setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
  }

  function nextMonth() {
    setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
  }

  function cancelAppointment(item: Appointment) {
    const ok = window.confirm(`Cancelar o agendamento de ${item.pet} em ${formatDate(item.date)} às ${item.time}? O horário ficará disponível novamente.`);
    if (!ok) return;
    setAppointmentStatus(item.id, "Cancelado");
    refresh();
    setMessage(`Agendamento de ${item.pet} cancelado. O horário ${item.time} foi liberado.`);
    window.setTimeout(() => setMessage(""), 3500);
  }

  const weekDates = useMemo(() => {
    const selected = isoToDate(selectedDate);
    const start = new Date(selected);
    start.setDate(selected.getDate() - selected.getDay());
    return Array.from({ length: 7 }, (_, index) => {
      const d = new Date(start);
      d.setDate(start.getDate() + index);
      return { iso: dateToIso(d), label: weekdays[d.getDay()], day: d.getDate() };
    });
  }, [selectedDate]);

  return (
    <MobilePage>
      <BrandHeader back />
      <div className="px-5 pb-4">
        {search.get("criado") && (
          <div className="mt-2 rounded-2xl bg-green-50 p-3 font-bold text-green-700">✓ Agendamento criado com sucesso.</div>
        )}
        {message && <div className="mt-2 rounded-2xl bg-green-50 p-3 text-sm font-bold text-green-700">✓ {message}</div>}

        <div className="mt-2">
          <h1 className="text-4xl font-black"><span className="text-sky-600">Sua</span><br />agenda</h1>
          <p className="muted mt-2">Consulte seus horários e cancele quando precisar. 🐾</p>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1">
          {[
            { label: "Hoje", action: selectToday },
            { label: "Semana", action: () => setView("Semana") },
            { label: "Mês", action: () => setView("Mês") },
          ].map((item) => (
            <button key={item.label} onClick={item.action} className={`cursor-pointer rounded-xl py-3 font-bold ${view === item.label ? "bg-teal-500 text-white" : "muted"}`}>
              {item.label}
            </button>
          ))}
        </div>

        {view === "Semana" ? (
          <section className="card mt-3 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-black">Semana selecionada</h2>
              <button onClick={() => setView("Mês")} className="teal text-sm font-bold">Ver calendário</button>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {weekDates.map((d) => {
                const active = d.iso === selectedDate;
                const hasAppointment = appointmentDates.has(d.iso);
                return (
                  <button key={d.iso} onClick={() => setSelectedDate(d.iso)} className={`rounded-2xl px-1 py-3 text-center ${active ? "bg-teal-500 text-white" : "bg-slate-50 text-slate-700"}`}>
                    <span className="block text-[10px] font-bold">{d.label}</span>
                    <span className="mt-1 block text-lg font-black">{d.day}</span>
                    <span className={`mx-auto mt-1 block h-1.5 w-1.5 rounded-full ${hasAppointment ? active ? "bg-white" : "bg-teal-500" : "bg-transparent"}`} />
                  </button>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="card mt-3 p-4">
            <div className="flex items-center justify-between font-black">
              <button onClick={previousMonth} className="grid h-9 w-9 place-items-center rounded-full bg-slate-50 text-xl">‹</button>
              <span>{monthNames[monthDate.getMonth()]} de {monthDate.getFullYear()}</span>
              <button onClick={nextMonth} className="grid h-9 w-9 place-items-center rounded-full bg-slate-50 text-xl">›</button>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-y-2 text-center text-sm">
              {weekdays.map((day) => <span key={day} className="text-[11px] font-bold text-slate-400">{day}</span>)}
              {calendarCells.map((cell, index) => {
                if (!cell) return <span key={`empty-${index}`} />;
                const active = cell.iso === selectedDate;
                const hasAppointment = appointmentDates.has(cell.iso);
                return (
                  <button key={cell.iso} onClick={() => setSelectedDate(cell.iso)} className={`relative mx-auto grid h-10 w-10 place-items-center rounded-full font-bold transition ${active ? "bg-teal-500 text-white shadow-md" : "text-slate-600 hover:bg-teal-50"}`} aria-label={`Selecionar ${formatDate(cell.iso)}`}>
                    {cell.day}
                    {hasAppointment && <span className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${active ? "bg-white" : "bg-teal-500"}`} />}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-center text-xs text-slate-500">• O ponto verde indica que existe agendamento ativo no dia.</p>
          </section>
        )}

        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            <h2 className="section-title">Agendamentos do dia</h2>
            <p className="muted mt-1 text-sm">{formatDate(selectedDate)}</p>
          </div>
          <Link href={`/agenda/novo?data=${selectedDate}`} className="teal whitespace-nowrap font-bold">Novo +</Link>
        </div>

        <div className="mt-3 space-y-3">
          {selectedAppointments.length === 0 ? (
            <div className="card p-5 text-center">
              <div className="text-3xl">📅</div>
              <h3 className="mt-2 font-black">Nenhum agendamento ativo neste dia</h3>
              <p className="muted mt-1 text-sm">Você pode escolher um serviço e um profissional/equipe disponível para {formatDate(selectedDate)}.</p>
              <Link href={`/agenda/novo?data=${selectedDate}`} className="primary mt-4 inline-flex px-5 py-3">Agendar neste dia</Link>
            </div>
          ) : selectedAppointments.map((a) => (
            <div className="card p-4" key={a.id}>
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-teal-50 text-2xl">{a.pet.toLowerCase().includes("luna") ? "🐱" : "🐶"}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-black">{a.pet}</h3>
                      <span className="pill mt-1 inline-block">{a.service}</span>
                    </div>
                    <span className="pill shrink-0">{a.status || "Agendado"}</span>
                  </div>
                  <p className="muted mt-2 text-sm">🕐 {a.time}</p>
                  {a.professionalName && <p className="muted mt-1 text-sm">👩‍⚕️ {a.professionalName}</p>}
                  {a.sector && <p className="mt-1 text-xs font-bold text-teal-700">{a.sector}</p>}
                </div>
              </div>
              {a.status === "Concluído" ? null : (
                <button onClick={() => cancelAppointment(a)} className="mt-4 w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 font-black text-red-600">
                  Cancelar agendamento
                </button>
              )}
            </div>
          ))}
        </div>

        <Link href={`/agenda/novo?data=${selectedDate}`} className="primary mt-4 flex justify-between px-6 py-4 text-lg">
          <span>＋ Agendar em {formatDate(selectedDate).slice(0, 5)}</span><span>›</span>
        </Link>
      </div>
    </MobilePage>
  );
}
