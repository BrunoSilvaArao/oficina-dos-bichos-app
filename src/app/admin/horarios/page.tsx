"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { backend, BackendAvailabilityRule, BackendClinicException, BackendProfessional, BackendService } from "@/lib/backend";
import AdminMobileNav from "@/components/AdminMobileNav";

const WEEKDAYS = [
  { value: 1, label: "Segunda" }, { value: 2, label: "Terça" }, { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" }, { value: 5, label: "Sexta" }, { value: 6, label: "Sábado" }, { value: 0, label: "Domingo" },
];
const dateLabel=(iso?:string)=>iso?iso.split("-").reverse().join("/"):"";

type WeeklyDraft = Record<number,{open:boolean;start:string;end:string}>;

export default function AdminHorariosPage(){
  const [tab,setTab]=useState<"weekly"|"professionals"|"exceptions">("weekly");
  const [professionals,setProfessionals]=useState<BackendProfessional[]>([]);
  const [services,setServices]=useState<BackendService[]>([]);
  const [rules,setRules]=useState<BackendAvailabilityRule[]>([]);
  const [clinicExceptions,setClinicExceptions]=useState<BackendClinicException[]>([]);
  const [professionalId,setProfessionalId]=useState("");
  const [serviceId,setServiceId]=useState("");
  const [weeklyDraft,setWeeklyDraft]=useState<WeeklyDraft>({});
  const [message,setMessage]=useState(""); const [error,setError]=useState(""); const [loading,setLoading]=useState(true);

  const [newName,setNewName]=useState(""); const [newRole,setNewRole]=useState(""); const [newSector,setNewSector]=useState(""); const [newServiceIds,setNewServiceIds]=useState<string[]>([]);
  const [exceptionScope,setExceptionScope]=useState<"clinic"|"professional">("professional");
  const [exceptionDate,setExceptionDate]=useState(""); const [exceptionClosed,setExceptionClosed]=useState(true); const [exceptionStart,setExceptionStart]=useState("09:00"); const [exceptionEnd,setExceptionEnd]=useState("12:00"); const [exceptionNote,setExceptionNote]=useState("");

  async function refresh(){
    const [ps,ss,rs,ce]=await Promise.all([backend.professionals(),backend.services(),backend.availabilityRules(),backend.clinicExceptions()]);
    setProfessionals(ps); setServices(ss); setRules(rs); setClinicExceptions(ce);
    setProfessionalId(c=>c&&ps.some(p=>p.id===c)?c:(ps[0]?.id||""));
    if(!newServiceIds.length&&ss[0]) setNewServiceIds([ss[0].id]);
  }

  useEffect(()=>{(async()=>{
    if(backend.configured()){
      if(!(await backend.session())){window.location.href="/login";return;}
      const p=await backend.profile(); if(!p||p.role==="client"){window.location.href="/";return;}
    }
    await refresh();
  })().catch(e=>setError(e instanceof Error?e.message:"Erro ao carregar horários.")).finally(()=>setLoading(false));},[]);

  const selectedProfessional=useMemo(()=>professionals.find(p=>p.id===professionalId),[professionals,professionalId]);
  const allowedServices=useMemo(()=>!selectedProfessional?[]:services.filter(s=>selectedProfessional.serviceIds.length?selectedProfessional.serviceIds.includes(s.id):selectedProfessional.services.includes(s.name)),[selectedProfessional,services]);
  useEffect(()=>{if(!allowedServices.some(s=>s.id===serviceId)) setServiceId(allowedServices[0]?.id||"");},[allowedServices,serviceId]);

  useEffect(()=>{
    if(!professionalId||!serviceId)return;
    const next:WeeklyDraft={};
    WEEKDAYS.forEach(d=>{
      const r=rules.find(x=>!x.date&&x.professionalId===professionalId&&x.serviceId===serviceId&&x.weekday===d.value);
      next[d.value]={open:r?!r.isClosed:(d.value>=1&&d.value<=5),start:r?.startTime||"09:00",end:r?.endTime||"18:00"};
    });
    setWeeklyDraft(next);
  },[professionalId,serviceId,rules]);

  function flash(msg:string){setMessage(msg);window.setTimeout(()=>setMessage(""),3500)}

  async function saveWeekly(){
    setError(""); if(!professionalId||!serviceId)return;
    try{
      await Promise.all(WEEKDAYS.map(d=>{const x=weeklyDraft[d.value]||{open:false,start:"09:00",end:"18:00"};return backend.saveAvailabilityWindow({professionalId,serviceId,weekday:d.value,startTime:x.start,endTime:x.end,isClosed:!x.open});}));
      await refresh(); flash("Horário semanal salvo. Ele será repetido automaticamente toda semana.");
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível salvar o horário semanal.")}
  }

  async function addProfessional(e:FormEvent){e.preventDefault();setError("");if(!newName.trim()||!newSector.trim()||!newServiceIds.length)return;
    try{await backend.addProfessional({name:newName.trim(),role:newRole.trim()||"Profissional",sector:newSector.trim(),serviceIds:newServiceIds,serviceNames:services.filter(s=>newServiceIds.includes(s.id)).map(s=>s.name)});setNewName("");setNewRole("");setNewSector("");setNewServiceIds(services[0]?[services[0].id]:[]);await refresh();flash("Profissional/equipe cadastrado.");}catch(e){setError(e instanceof Error?e.message:"Não foi possível cadastrar.")}}
  async function toggleProfessional(p:BackendProfessional){try{await backend.toggleProfessional(p.id,!p.active);await refresh()}catch(e){setError(e instanceof Error?e.message:"Não foi possível alterar o profissional.")}}
  async function changeDuration(s:BackendService,value:string){const n=Number(value);if(!n||n<5)return;try{await backend.updateServiceDuration(s.id,n);await refresh();flash(`Duração de ${s.name} atualizada para ${n} minutos.`)}catch(e){setError(e instanceof Error?e.message:"Não foi possível alterar a duração.")}}

  async function saveException(e:FormEvent){e.preventDefault();setError("");if(!exceptionDate)return;
    try{
      if(exceptionScope==="clinic"){
        await backend.setClinicException(exceptionDate,true,exceptionNote||"Clínica fechada");
      }else{
        if(!professionalId||!serviceId)return;
        await backend.saveAvailabilityWindow({professionalId,serviceId,date:exceptionDate,startTime:exceptionStart,endTime:exceptionEnd,isClosed:exceptionClosed});
      }
      await refresh();flash(exceptionScope==="clinic"?"Data bloqueada para toda a clínica.":"Exceção do profissional salva.");
      setExceptionNote("");
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível salvar a exceção.")}
  }
  async function deleteRule(id:string){try{await backend.removeAvailabilityRule(id);await refresh()}catch(e){setError(e instanceof Error?e.message:"Não foi possível excluir.")}}
  async function deleteClinic(date:string){try{await backend.removeClinicException(date);await refresh()}catch(e){setError(e instanceof Error?e.message:"Não foi possível excluir.")}}

  const datedRules=rules.filter(r=>Boolean(r.date));

  return <main className="admin-page min-h-screen bg-slate-50 p-5 md:p-8"><div className="mx-auto max-w-7xl">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><Link href="/admin" className="font-bold teal">‹ Dashboard</Link><h1 className="mt-2 text-4xl font-black">Profissionais &amp; <span className="teal">horários</span></h1><p className="mt-1 text-slate-500">Regra semanal padrão, profissionais e exceções por data.</p></div><Link href="/admin/agenda" className="primary px-5 py-3">Ver agenda</Link></div>
    {message&&<div className="mt-4 rounded-2xl bg-green-50 p-4 font-bold text-green-700">✓ {message}</div>}{error&&<div className="mt-4 rounded-2xl bg-red-50 p-4 font-bold text-red-700">⚠ {error}</div>}
    <div className="mt-5 grid gap-2 rounded-2xl bg-white p-2 shadow-sm md:grid-cols-3">{[["weekly","Horário semanal"],["professionals","Profissionais e serviços"],["exceptions","Bloqueios e exceções"]].map(([v,l])=><button key={v} onClick={()=>setTab(v as any)} className={`rounded-xl px-4 py-3 font-black ${tab===v?"bg-teal-500 text-white":"bg-slate-50 text-slate-600"}`}>{l}</button>)}</div>
    {loading?<div className="card mt-5 p-5 font-bold">Carregando...</div>:<>
      {tab==="weekly"&&<section className="card mt-5 p-5"><h2 className="section-title">Horário semanal</h2><p className="muted mt-1">Defina o expediente padrão de cada profissional. A regra se repete automaticamente todas as semanas.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2"><label><span className="field-label">Profissional / equipe</span><select className="field" value={professionalId} onChange={e=>setProfessionalId(e.target.value)}>{professionals.map(p=><option key={p.id} value={p.id}>{p.name}{p.active?"":" (inativo)"}</option>)}</select></label><label><span className="field-label">Serviço</span><select className="field" value={serviceId} onChange={e=>setServiceId(e.target.value)}>{allowedServices.map(s=><option key={s.id} value={s.id}>{s.name} • {s.duration_minutes} min</option>)}</select></label></div>
        <div className="mt-5 space-y-2">{WEEKDAYS.map(d=>{const x=weeklyDraft[d.value]||{open:false,start:"09:00",end:"18:00"};return <div key={d.value} className="grid items-center gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-[170px_120px_1fr_1fr]"><div className="font-black">{d.label}</div><label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={x.open} onChange={e=>setWeeklyDraft(c=>({...c,[d.value]:{...x,open:e.target.checked}}))}/>{x.open?"Atende":"Fechado"}</label><label><span className="field-label">Início</span><input type="time" className="field" disabled={!x.open} value={x.start} onChange={e=>setWeeklyDraft(c=>({...c,[d.value]:{...x,start:e.target.value}}))}/></label><label><span className="field-label">Fim</span><input type="time" className="field" disabled={!x.open} value={x.end} onChange={e=>setWeeklyDraft(c=>({...c,[d.value]:{...x,end:e.target.value}}))}/></label></div>})}</div>
        <div className="mt-4 rounded-2xl bg-teal-50 p-4 text-sm font-bold text-teal-800">Os horários oferecidos ao cliente são calculados automaticamente pela duração do serviço. Ex.: serviço de 60 min em 09:00–18:00 gera 09:00, 10:00, 11:00…</div>
        <button onClick={saveWeekly} className="primary mt-4 px-6 py-3">Salvar horário semanal</button>
      </section>}

      {tab==="professionals"&&<div className="mt-5 grid gap-5 xl:grid-cols-2"><section className="card p-5"><h2 className="section-title">Profissionais e equipes</h2><div className="mt-4 space-y-3">{professionals.map(p=><div key={p.id} className="rounded-2xl bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black">{p.name}</p><p className="text-sm text-slate-500">{p.role} • {p.sector}</p><p className="mt-2 text-xs font-bold teal">{p.services.join(" • ")}</p></div><button onClick={()=>toggleProfessional(p)} className={`rounded-full px-3 py-1 text-xs font-black ${p.active?"bg-green-100 text-green-700":"bg-slate-200 text-slate-600"}`}>{p.active?"Ativo":"Inativo"}</button></div></div>)}</div></section>
        <div className="space-y-5"><section className="card p-5"><h2 className="section-title">Serviços e duração</h2><p className="muted mt-1 text-sm">A duração determina os intervalos exibidos na agenda.</p><div className="mt-4 space-y-3">{services.map(s=><div key={s.id} className="grid items-center gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-[1fr_150px]"><div><b>{s.name}</b><div className="text-sm text-slate-500">{s.sector}</div></div><label><span className="field-label">Minutos</span><input className="field" type="number" min="5" step="5" defaultValue={s.duration_minutes} onBlur={e=>changeDuration(s,e.target.value)}/></label></div>)}</div></section>
        <section className="card p-5"><h2 className="section-title">Cadastrar profissional/equipe</h2><form onSubmit={addProfessional} className="mt-4 space-y-3"><input className="field" placeholder="Nome" value={newName} onChange={e=>setNewName(e.target.value)} required/><input className="field" placeholder="Função (ex.: Veterinária)" value={newRole} onChange={e=>setNewRole(e.target.value)}/><input className="field" placeholder="Setor" value={newSector} onChange={e=>setNewSector(e.target.value)} required/><div><span className="field-label">Serviços que pode atender</span><div className="grid grid-cols-2 gap-2">{services.map(s=><label key={s.id} className="flex items-center gap-2 rounded-xl bg-slate-50 p-2 text-sm font-bold"><input type="checkbox" checked={newServiceIds.includes(s.id)} onChange={()=>setNewServiceIds(c=>c.includes(s.id)?c.filter(x=>x!==s.id):[...c,s.id])}/>{s.name}</label>)}</div></div><button className="primary w-full py-3">＋ Cadastrar</button></form></section></div></div>}

      {tab==="exceptions"&&<div className="mt-5 grid gap-5 xl:grid-cols-[.9fr_1.1fr]"><section className="card p-5"><h2 className="section-title">Nova exceção por data</h2><p className="muted mt-1 text-sm">Use apenas para feriado, férias, ausência ou alteração pontual.</p><form onSubmit={saveException} className="mt-5 space-y-4"><label><span className="field-label">Aplicar a</span><select className="field" value={exceptionScope} onChange={e=>setExceptionScope(e.target.value as any)}><option value="professional">Um profissional/serviço</option><option value="clinic">Toda a clínica</option></select></label>{exceptionScope==="professional"&&<><label><span className="field-label">Profissional</span><select className="field" value={professionalId} onChange={e=>setProfessionalId(e.target.value)}>{professionals.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label><span className="field-label">Serviço</span><select className="field" value={serviceId} onChange={e=>setServiceId(e.target.value)}>{allowedServices.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label></>}<label><span className="field-label">Data</span><input className="field" type="date" value={exceptionDate} onChange={e=>setExceptionDate(e.target.value)} required/></label>{exceptionScope==="professional"&&<><label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 font-bold"><input type="checkbox" checked={exceptionClosed} onChange={e=>setExceptionClosed(e.target.checked)}/>Não atende nesta data</label>{!exceptionClosed&&<div className="grid grid-cols-2 gap-3"><label><span className="field-label">Início especial</span><input className="field" type="time" value={exceptionStart} onChange={e=>setExceptionStart(e.target.value)}/></label><label><span className="field-label">Fim especial</span><input className="field" type="time" value={exceptionEnd} onChange={e=>setExceptionEnd(e.target.value)}/></label></div>}</>}<label><span className="field-label">Motivo / observação</span><input className="field" value={exceptionNote} onChange={e=>setExceptionNote(e.target.value)} placeholder="Ex.: feriado, férias, compromisso particular"/></label><button className="primary w-full py-3">Salvar exceção</button></form></section>
        <section className="card p-5"><h2 className="section-title">Bloqueios e exceções cadastrados</h2><div className="mt-4 space-y-3">{clinicExceptions.map(x=><div key={`clinic-${x.date}`} className="flex items-start justify-between gap-3 rounded-2xl bg-red-50 p-4"><div><b>{dateLabel(x.date)} • Clínica fechada</b><p className="text-sm text-slate-600">{x.note||"Bloqueio geral"}</p></div><button onClick={()=>deleteClinic(x.date)} className="rounded-xl bg-white px-3 py-2 text-sm font-black text-red-600">Excluir</button></div>)}{datedRules.map(r=>{const p=professionals.find(x=>x.id===r.professionalId);return <div key={r.id} className="flex items-start justify-between gap-3 rounded-2xl bg-slate-50 p-4"><div><b>{dateLabel(r.date)} • {p?.name||"Profissional"}</b><p className="text-sm text-slate-600">{r.service} • {r.isClosed?"Não atende":`${r.startTime}–${r.endTime}`}</p></div><button onClick={()=>deleteRule(r.id)} className="rounded-xl bg-white px-3 py-2 text-sm font-black text-red-600">Excluir</button></div>})}{!clinicExceptions.length&&!datedRules.length&&<p className="text-sm text-slate-500">Nenhuma exceção cadastrada.</p>}</div></section></div>}
    </>}
  </div><AdminMobileNav/></main>
}
