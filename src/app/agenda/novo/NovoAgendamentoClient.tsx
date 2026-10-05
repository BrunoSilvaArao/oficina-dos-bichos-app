"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BrandHeader from "@/components/BrandHeader";
import MobilePage from "@/components/MobilePage";
import { backend, BackendPet, BackendProfessional, BackendService } from "@/lib/backend";

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
  const [pets, setPets] = useState<BackendPet[]>([]);
  const [services, setServices] = useState<BackendService[]>([]);
  const [professionals, setProfessionals] = useState<BackendProfessional[]>([]);
  const [petId, setPetId] = useState(search.get("petId") || "");
  const [serviceId, setServiceId] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [date, setDate] = useState(search.get("data") || "");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [times, setTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      if (backend.configured() && !(await backend.session())) {
        router.replace("/login");
        return;
      }
      const [petItems, serviceItems] = await Promise.all([backend.pets(), backend.services()]);
      setPets(petItems);
      setServices(serviceItems);
      setPetId((current) => current && petItems.some((p) => p.id === current) ? current : (petItems[0]?.id || ""));
      const requestedService = search.get("servico");
      const firstService = serviceItems.find((s) => s.name === requestedService || s.slug === requestedService) || serviceItems[0];
      setServiceId(firstService?.id || "");
      setLoading(false);
    })().catch((err) => { setError(err instanceof Error ? err.message : "Não foi possível carregar o agendamento."); setLoading(false); });
  }, [router, search]);

  const selectedService = useMemo(() => services.find((s) => s.id === serviceId), [services, serviceId]);
  const selectedProfessional = useMemo(() => professionals.find((p) => p.id === professionalId), [professionals, professionalId]);
  const selectedPet = useMemo(() => pets.find((p) => p.id === petId), [pets, petId]);

  useEffect(() => {
    if (!serviceId || !selectedService) return;
    setTimes([]); setTime("");
    backend.professionals(serviceId, selectedService.name)
      .then((items) => {
        setProfessionals(items);
        setProfessionalId((current) => items.some((p) => p.id === current) ? current : (items[0]?.id || ""));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Não foi possível carregar os profissionais."));
  }, [serviceId, selectedService]);

  useEffect(() => {
    if (!date || !serviceId || !professionalId || !selectedService) { setTimes([]); setTime(""); return; }
    setLoadingTimes(true); setError("");
    backend.availableTimes(date, serviceId, professionalId, selectedService.name)
      .then((items) => { setTimes(items); setTime((current) => items.includes(current) ? current : ""); })
      .catch((err) => setError(err instanceof Error ? err.message : "Não foi possível consultar os horários."))
      .finally(() => setLoadingTimes(false));
  }, [date, serviceId, professionalId, selectedService]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!petId) return setError("Cadastre ou selecione um pet para continuar.");
    if (!serviceId || !selectedService) return setError("Escolha o serviço.");
    if (!professionalId || !selectedProfessional) return setError("Escolha o profissional ou equipe.");
    if (!date || !time) return setError("Escolha a data e o horário.");

    try {
      setSubmitting(true);
      await backend.bookAppointment({
        petId,
        petName: selectedPet?.name,
        serviceId,
        serviceName: selectedService.name,
        professionalId,
        professionalName: selectedProfessional.name,
        sector: selectedProfessional.sector,
        date,
        time,
        notes,
      });
      router.push(`/agenda?criado=1&data=${date}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível agendar.";
      setError(message.includes("SLOT_UNAVAILABLE") ? "Este horário acabou de ser ocupado. Escolha outro horário." : message);
      try {
        setTimes(await backend.availableTimes(date, serviceId, professionalId, selectedService.name));
        setTime("");
      } catch { /* keep original error */ }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <MobilePage><BrandHeader back /><div className="px-5"><div className="card mt-5 p-6 text-center font-bold">Carregando agenda...</div></div></MobilePage>;

  return (
    <MobilePage>
      <BrandHeader back />
      <div className="px-5 pb-5">
        <h1 className="mt-2 text-4xl font-black">Novo <span className="teal">agendamento</span></h1>
        <p className="muted mt-2">Cada profissional ou equipe possui sua própria agenda.</p>

        {pets.length === 0 ? (
          <div className="card mt-5 p-6 text-center">
            <div className="text-5xl">🐾</div>
            <h2 className="mt-3 text-xl font-black">Cadastre um pet primeiro</h2>
            <p className="muted mt-1">O agendamento fica vinculado ao pet e ao tutor.</p>
            <button onClick={() => router.push("/pets/novo")} className="primary mt-4 px-5 py-3">Cadastrar pet</button>
          </div>
        ) : (
          <form onSubmit={submit} className="card mt-5 space-y-5 p-5">
            <label className="block"><span className="field-label">Pet</span><select value={petId} onChange={(e) => setPetId(e.target.value)} className="field">{pets.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label>

            <label className="block"><span className="field-label">Serviço</span><select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="field">{services.map((s) => <option value={s.id} key={s.id}>{s.name} — {s.sector}</option>)}</select></label>

            <label className="block"><span className="field-label">Profissional / equipe</span><select value={professionalId} onChange={(e) => setProfessionalId(e.target.value)} className="field" disabled={!professionals.length}>{!professionals.length && <option value="">Nenhum disponível</option>}{professionals.map((p) => <option value={p.id} key={p.id}>{p.name} — {p.sector}</option>)}</select></label>

            <label className="block"><span className="field-label">Data</span><input required min={todayIso()} type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field" /></label>

            <div>
              <span className="field-label">Horário</span>
              {!date && <p className="mb-2 text-sm text-slate-500">Escolha a data para consultar a disponibilidade.</p>}
              {loadingTimes && <div className="rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-600">Consultando horários...</div>}
              {!loadingTimes && date && professionalId && times.length === 0 && <div className="rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-800">Não há horários livres para este profissional/equipe nesta data.</div>}
              <div className="mt-2 grid grid-cols-3 gap-2">
                {times.map((t) => <button type="button" key={t} onClick={() => setTime(t)} className={`min-h-14 rounded-xl px-2 py-2 font-black transition ${time === t ? "bg-teal-500 text-white" : "bg-teal-50 text-teal-700"}`}>{t}</button>)}
              </div>
              {times.length > 0 && <p className="mt-2 text-xs text-slate-500">A reserva é validada novamente no servidor ao confirmar, evitando dupla marcação.</p>}
            </div>

            <label className="block"><span className="field-label">Observações</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="field min-h-24 resize-none" placeholder="Ex.: pet ansioso, preferência de atendimento..." /></label>
            {error && <div className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">⚠ {error}</div>}
            <button className="primary w-full py-4 text-lg disabled:cursor-not-allowed disabled:opacity-50" type="submit" disabled={!date || !time || !professionalId || submitting}>{submitting ? "Confirmando..." : "Confirmar agendamento"}</button>
          </form>
        )}
      </div>
    </MobilePage>
  );
}
