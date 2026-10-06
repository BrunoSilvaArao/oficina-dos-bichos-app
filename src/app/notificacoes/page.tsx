"use client";

import { useEffect, useState } from "react";
import BrandHeader from "@/components/BrandHeader";
import MobilePage from "@/components/MobilePage";
import { backend, BackendNotification } from "@/lib/backend";

function icon(kind:string){return kind==="order"?"📦":kind==="appointment"?"📅":"🔔"}

export default function NotificacoesPage(){
  const [items,setItems]=useState<BackendNotification[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  async function refresh(){setItems(await backend.notifications("client"));}
  useEffect(()=>{(async()=>{if(backend.configured()&&!(await backend.session())){window.location.href="/login";return;}await refresh();})().catch(e=>setError(e instanceof Error?e.message:"Não foi possível carregar as notificações.")).finally(()=>setLoading(false));},[]);
  async function open(n:BackendNotification){if(!n.readAt){await backend.markNotificationRead(n.id);await refresh();}}
  async function readAll(){await backend.markAllNotificationsRead("client");await refresh();}
  return <MobilePage><BrandHeader back/><div className="px-5 pb-5"><div className="flex items-end justify-between gap-3"><div><h1 className="text-4xl font-black">Minhas <span className="teal">notificações</span></h1><p className="muted mt-2">Atualizações de agendamentos e pedidos.</p></div>{items.some(n=>!n.readAt)&&<button onClick={readAll} className="pill whitespace-nowrap">Ler todas</button>}</div>
  {error&&<div className="mt-4 rounded-2xl bg-red-50 p-4 font-bold text-red-700">⚠ {error}</div>}
  {loading?<div className="card mt-4 p-5 font-bold">Carregando...</div>:<div className="mt-4 space-y-3">{items.map(n=><button key={n.id} onClick={()=>open(n)} className={`card block w-full p-4 text-left ${!n.readAt?"ring-2 ring-teal-100":""}`}><div className="flex gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-teal-50 text-xl">{icon(n.kind)}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h2 className="font-black">{n.title}</h2>{!n.readAt&&<span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-teal-500"/>}</div><p className="mt-1 text-sm leading-relaxed text-slate-600">{n.body}</p><p className="mt-2 text-xs text-slate-400">{new Date(n.createdAt).toLocaleString("pt-BR")}</p></div></div></button>)}{!items.length&&<div className="card p-6 text-center text-slate-500">Você ainda não tem notificações.</div>}</div>}</div></MobilePage>
}
