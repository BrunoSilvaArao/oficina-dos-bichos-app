"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AvailabilityRule, Professional, storage } from "@/lib/storage";

const SERVICES = ["Veterinário", "Vacinação", "Banho & Tosa", "Hotelzinho", "Creche Pet"];
const TIMES = ["07:00", "08:00", "09:00", "10:00", "10:30", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "17:30", "18:00", "19:00"];
const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function dateLabel(iso?: string) {
  if (!iso) return "";
  return iso.split("-").reverse().join("/");
}

export default function AdminHorariosPage() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [professionalId, setProfessionalId] = useState("");
  const [service, setService] = useState("");
  const [date, setDate] = useState("");
  const [weekly, setWeekly] = useState(false);
  const [selectedTimes, setSelectedTimes] = useState<string[]>(["09:00", "10:30", "14:00", "16:00"]);
  const [message, setMessage] = useState("");

  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newSector, setNewSector] = useState("");
  const [newServices, setNewServices] = useState<string[]>(["Veterinário"]);

  function refresh() {
    const ps = storage.professionals.get();
    setProfessionals(ps);
    setRules(storage.availability.get());
    if (!professionalId && ps[0]) setProfessionalId(ps[0].id);
  }

  useEffect(() => { refresh(); }, []);

  const selectedProfessional = useMemo(
    () => professionals.find((p) => p.id === professionalId),
    [professionals, professionalId],
  );

  useEffect(() => {
    const services = selectedProfessional?.services || [];
    if (!services.includes(service)) setService(services[0] || "");
  }, [selectedProfessional, service]);

  function toggleTime(t: string) {
    setSelectedTimes((current) => current.includes(t) ? current.filter((x) => x !== t) : [...current, t].sort());
  }

  function saveRule(e: FormEvent) {
    e.preventDefault();
    if (!professionalId || !service || !date) return;
    const dateObj = new Date(`${date}T12:00:00`);
    const rule: AvailabilityRule = {
      id: String(Date.now()),
      professionalId,
      service,
      times: [...selectedTimes].sort(),
      ...(weekly ? { weekday: dateObj.getDay() } : { date }),
    };
    const next = [
      ...rules.filter((existing) => {
        if (existing.professionalId !== professionalId || existing.service !== service) return true;
        return weekly ? existing.weekday !== rule.weekday || Boolean(existing.date) : existing.date !== date;
      }),
      rule,
    ];
    storage.availability.set(next);
    setRules(next);
    setMessage(selectedTimes.length ? "Horários salvos. A agenda do cliente já usa esta disponibilidade." : "Dia bloqueado: nenhum horário ficará disponível nesta regra.");
    window.setTimeout(() => setMessage(""), 3500);
  }

  function blockDate() {
    if (!professionalId || !service || !date) return;
    const next = [
      ...rules.filter((existing) => !(existing.professionalId === professionalId && existing.service === service && existing.date === date)),
      { id: String(Date.now()), professionalId, service, date, times: [] },
    ];
    storage.availability.set(next);
    setRules(next);
    setSelectedTimes([]);
    setWeekly(false);
    setMessage("Data bloqueada para este profissional/equipe e serviço.");
    window.setTimeout(() => setMessage(""), 3500);
  }

  function removeRule(id: string) {
    const next = rules.filter((r) => r.id !== id);
    storage.availability.set(next);
    setRules(next);
  }

  function addProfessional(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newSector.trim() || newServices.length === 0) return;
    const item: Professional = {
      id: `prof-${Date.now()}`,
      name: newName.trim(),
      role: newRole.trim() || "Profissional",
      sector: newSector.trim(),
      services: newServices,
      active: true,
    };
    const next = [...professionals, item];
    storage.professionals.set(next);
    setProfessionals(next);
    setProfessionalId(item.id);
    setNewName(""); setNewRole(""); setNewSector(""); setNewServices(["Veterinário"]);
    setMessage(`${item.name} cadastrado. Agora você pode definir os horários.`);
  }

  function toggleProfessional(id: string) {
    const next = professionals.map((p) => p.id === id ? { ...p, active: !p.active } : p);
    storage.professionals.set(next);
    setProfessionals(next);
  }

  return (
    <main className="min-h-screen bg-slate-50 p-5 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Link href="/admin" className="font-bold teal">‹ Dashboard</Link>
            <h1 className="mt-2 text-4xl font-black">Profissionais &amp; <span className="teal">horários</span></h1>
            <p className="mt-1 text-slate-500">A clínica controla quem atende, quais serviços e em quais horários.</p>
          </div>
          <Link href="/admin/agenda" className="primary px-5 py-3">Ver agenda</Link>
        </div>

        {message && <div className="mt-4 rounded-2xl bg-green-50 p-4 font-bold text-green-700">✓ {message}</div>}

        <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
          <section className="card p-5">
            <h2 className="section-title">Disponibilidade</h2>
            <p className="muted mt-1 text-sm">Uma regra específica de data tem prioridade. Se marcar “repetir semanalmente”, ela valerá para aquele dia da semana.</p>

            <form onSubmit={saveRule} className="mt-5 grid gap-4 md:grid-cols-2">
              <label>
                <span className="field-label">Profissional / equipe</span>
                <select className="field" value={professionalId} onChange={(e) => setProfessionalId(e.target.value)}>
                  {professionals.map((p) => <option key={p.id} value={p.id}>{p.name}{p.active ? "" : " (inativo)"}</option>)}
                </select>
              </label>
              <label>
                <span className="field-label">Serviço</span>
                <select className="field" value={service} onChange={(e) => setService(e.target.value)}>
                  {(selectedProfessional?.services || []).map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
              <label>
                <span className="field-label">Data de referência</span>
                <input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input type="checkbox" checked={weekly} onChange={(e) => setWeekly(e.target.checked)} className="h-5 w-5" />
                <span><b>Repetir semanalmente</b><br/><span className="text-sm text-slate-500">Ex.: toda terça-feira</span></span>
              </label>

              <div className="md:col-span-2">
                <span className="field-label">Horários que ficarão disponíveis</span>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {TIMES.map((t) => (
                    <button type="button" key={t} onClick={() => toggleTime(t)} className={`rounded-xl px-2 py-3 font-black ${selectedTimes.includes(t) ? "bg-teal-500 text-white" : "bg-slate-100 text-slate-600"}`}>
                      {t}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-500">Você pode selecionar vários. Horários ocupados por agendamentos continuam bloqueados automaticamente.</p>
              </div>

              <div className="flex flex-wrap gap-2 md:col-span-2">
                <button className="primary px-6 py-3" type="submit">Salvar disponibilidade</button>
                <button type="button" onClick={blockDate} disabled={!date} className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 font-black text-red-600 disabled:opacity-40">Bloquear esta data</button>
              </div>
            </form>

            <div className="mt-7 border-t border-slate-100 pt-5">
              <h3 className="font-black">Regras personalizadas</h3>
              {rules.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">Ainda não há regras personalizadas. Enquanto isso, a demonstração usa a grade padrão de segunda a sábado.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {rules.map((r) => {
                    const p = professionals.find((x) => x.id === r.professionalId);
                    return (
                      <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4">
                        <div>
                          <p className="font-black">{p?.name || "Profissional"} • {r.service}</p>
                          <p className="text-sm text-slate-500">{r.date ? `Data: ${dateLabel(r.date)}` : `Toda ${WEEKDAYS[r.weekday ?? 0]}`} • {r.times.length ? r.times.join(", ") : "Agenda fechada"}</p>
                        </div>
                        <button onClick={() => removeRule(r.id)} className="rounded-xl bg-white px-3 py-2 text-sm font-black text-red-600">Excluir regra</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-5">
            <section className="card p-5">
              <h2 className="section-title">Profissionais e equipes</h2>
              <div className="mt-4 space-y-3">
                {professionals.map((p) => (
                  <div key={p.id} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="font-black">{p.name}</p><p className="text-sm text-slate-500">{p.role} • {p.sector}</p></div>
                      <button onClick={() => toggleProfessional(p.id)} className={`rounded-full px-3 py-1 text-xs font-black ${p.active ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>{p.active ? "Ativo" : "Inativo"}</button>
                    </div>
                    <p className="mt-2 text-xs font-bold teal">{p.services.join(" • ")}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="card p-5">
              <h2 className="section-title">Cadastrar profissional/equipe</h2>
              <form onSubmit={addProfessional} className="mt-4 space-y-3">
                <input className="field" placeholder="Nome" value={newName} onChange={(e) => setNewName(e.target.value)} required />
                <input className="field" placeholder="Função (ex.: Veterinária)" value={newRole} onChange={(e) => setNewRole(e.target.value)} />
                <input className="field" placeholder="Setor" value={newSector} onChange={(e) => setNewSector(e.target.value)} required />
                <div>
                  <span className="field-label">Serviços que pode atender</span>
                  <div className="grid grid-cols-2 gap-2">
                    {SERVICES.map((s) => (
                      <label key={s} className="flex items-center gap-2 rounded-xl bg-slate-50 p-2 text-sm font-bold">
                        <input type="checkbox" checked={newServices.includes(s)} onChange={() => setNewServices((curr) => curr.includes(s) ? curr.filter((x) => x !== s) : [...curr, s])} /> {s}
                      </label>
                    ))}
                  </div>
                </div>
                <button className="primary w-full py-3">＋ Cadastrar</button>
              </form>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
