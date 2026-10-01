"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BrandHeader from "@/components/BrandHeader";
import MobilePage from "@/components/MobilePage";
import {
  getAllAppointments,
  getAvailableTimes,
  getProfessionalsForService,
  isSlotOccupied,
  Professional,
  storage,
} from "@/lib/storage";

const services = ["Veterinário", "Vacinação", "Banho & Tosa", "Hotelzinho", "Creche Pet"];

function todayIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function NovoAgendamentoClient() {
  const router = useRouter();
  const search = useSearchParams();
  const [pet, setPet] = useState(search.get("pet") || "Thor");
  const [service, setService] = useState(search.get("servico") || "Veterinário");
  const [date, setDate] = useState(search.get("data") || "");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [extraPets, setExtraPets] = useState<string[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [professionalId, setProfessionalId] = useState("");
  const [version, setVersion] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    setExtraPets(storage.pets.get().map((p) => p.name));
    const refresh = () => setVersion((v) => v + 1);
    window.addEventListener("odb-appointments-updated", refresh);
    window.addEventListener("odb-schedule-updated", refresh);
    return () => {
      window.removeEventListener("odb-appointments-updated", refresh);
      window.removeEventListener("odb-schedule-updated", refresh);
    };
  }, []);

  useEffect(() => {
    const available = getProfessionalsForService(service);
    setProfessionals(available);
    setProfessionalId((current) => available.some((p) => p.id === current) ? current : (available[0]?.id || ""));
    setTime("");
    setError("");
  }, [service, version]);

  const selectedProfessional = useMemo(
    () => professionals.find((p) => p.id === professionalId),
    [professionals, professionalId],
  );

  const availableTimes = useMemo(
    () => getAvailableTimes(date, service, professionalId),
    [date, service, professionalId, version],
  );

  const appointments = useMemo(() => getAllAppointments(), [version]);

  const occupiedTimes = useMemo(() => {
    if (!date || !professionalId) return new Set<string>();
    return new Set(
      availableTimes.filter((candidate) => isSlotOccupied(date, candidate, professionalId, appointments)),
    );
  }, [availableTimes, appointments, date, professionalId]);

  useEffect(() => {
    if (!date || !professionalId) return;
    if (!time || occupiedTimes.has(time) || !availableTimes.includes(time)) {
      setTime(availableTimes.find((candidate) => !occupiedTimes.has(candidate)) || "");
    }
    setError("");
  }, [date, professionalId, availableTimes, occupiedTimes, time]);

  function submit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!date) return setError("Escolha uma data para continuar.");
    if (!professionalId || !selectedProfessional) return setError("Não há profissional ou equipe disponível para este serviço.");
    if (!time) return setError("Não há horários disponíveis nesta data para este profissional/equipe.");

    const latest = getAllAppointments();
    if (isSlotOccupied(date, time, professionalId, latest)) {
      setVersion((v) => v + 1);
      setError(`O horário ${time} já está ocupado para ${selectedProfessional.name}. Escolha outro horário.`);
      return;
    }

    storage.appointments.add({
      id: String(Date.now()),
      pet,
      service,
      date,
      time,
      tutor: storage.profile.get().name || "Cliente",
      notes,
      status: "Agendado",
      resourceId: professionalId,
      professionalId,
      professionalName: selectedProfessional.name,
      sector: selectedProfessional.sector,
    });
    router.push(`/agenda?criado=1&data=${date}`);
  }

  return (
    <MobilePage>
      <BrandHeader back />
      <div className="px-5 pb-5">
        <h1 className="mt-2 text-4xl font-black">
          Novo <span className="teal">agendamento</span>
        </h1>
        <p className="muted mt-2">Agora cada setor/profissional possui sua própria agenda.</p>

        <div className="mt-4 rounded-2xl bg-cyan-50 p-4 text-sm text-cyan-900">
          <b>Exemplo:</b> o veterinário pode atender às 14:00 e o Banho &amp; Tosa também às 14:00, porque são recursos diferentes. Dois atendimentos com o mesmo profissional no mesmo horário continuam bloqueados.
        </div>

        <form onSubmit={submit} className="card mt-5 space-y-5 p-5">
          <label className="block">
            <span className="field-label">Pet</span>
            <select value={pet} onChange={(e) => setPet(e.target.value)} className="field">
              <option>Thor</option>
              <option>Luna</option>
              {extraPets.filter((p) => !["Thor", "Luna"].includes(p)).map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="field-label">Serviço</span>
            <select value={service} onChange={(e) => setService(e.target.value)} className="field">
              {services.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="field-label">Profissional / equipe</span>
            <select value={professionalId} onChange={(e) => setProfessionalId(e.target.value)} className="field" disabled={!professionals.length}>
              {!professionals.length && <option value="">Nenhum disponível</option>}
              {professionals.map((p) => <option value={p.id} key={p.id}>{p.name} — {p.sector}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="field-label">Data</span>
            <input required min={todayIso()} type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field" />
          </label>

          <div>
            <span className="field-label">Horário</span>
            {!date && <p className="mb-2 text-sm text-slate-500">Primeiro escolha a data para consultar a escala cadastrada pela clínica.</p>}
            {date && professionalId && availableTimes.length === 0 && (
              <div className="rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-800">
                A clínica ainda não disponibilizou horários para {selectedProfessional?.name} nesta data.
              </div>
            )}
            <div className="mt-2 grid grid-cols-3 gap-2">
              {availableTimes.map((t) => {
                const occupied = occupiedTimes.has(t);
                return (
                  <button
                    type="button"
                    key={t}
                    disabled={occupied}
                    onClick={() => { setTime(t); setError(""); }}
                    className={`min-h-14 rounded-xl px-2 py-2 font-black transition ${
                      occupied
                        ? "cursor-not-allowed bg-slate-100 text-slate-400"
                        : time === t
                        ? "bg-teal-500 text-white"
                        : "bg-teal-50 text-teal-700"
                    }`}
                  >
                    <span className="block">{t}</span>
                    {occupied && <span className="mt-0.5 block text-[10px] font-bold uppercase">Ocupado</span>}
                  </button>
                );
              })}
            </div>
            {date && availableTimes.length > 0 && (
              <p className="mt-2 text-xs text-slate-500">Um cancelamento libera o horário novamente de forma automática.</p>
            )}
          </div>

          <label className="block">
            <span className="field-label">Observações</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="field min-h-24 resize-none" placeholder="Ex.: pet ansioso, preferência de atendimento..." />
          </label>

          {error && <div className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">⚠ {error}</div>}

          <button className="primary w-full py-4 text-lg disabled:cursor-not-allowed disabled:opacity-50" type="submit" disabled={!date || !time || !professionalId}>
            Confirmar agendamento
          </button>
        </form>
      </div>
    </MobilePage>
  );
}
