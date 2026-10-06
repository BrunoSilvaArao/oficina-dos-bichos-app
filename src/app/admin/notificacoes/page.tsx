"use client";
import Link from "next/link";
import { useEffect,useState } from "react";
import AdminMobileNav from "@/components/AdminMobileNav";
import AdminMobileTopBar from "@/components/AdminMobileTopBar";
import { backend,BackendNotification } from "@/lib/backend";

const icon=(kind:string)=>kind==="order"?"📦":kind==="appointment"?"📅":"🔔";
export default function AdminNotificacoes(){
 const [items,setItems]=useState<BackendNotification[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState("");
 async function refresh(){setItems(await backend.notifications("admin"));}
 useEffect(()=>{(async()=>{if(backend.configured()){if(!(await backend.session())){window.location.href="/login";return;}const p=await backend.profile();if(!p||p.role==="client"){window.location.href="/";return;}}await refresh()})().catch(e=>setError(e instanceof Error?e.message:"Não foi possível carregar as notificações.")).finally(()=>setLoading(false))},[]);
 async function readAll(){await backend.markAllNotificationsRead("admin");await refresh();}
 async function read(n:BackendNotification){if(!n.readAt){await backend.markNotificationRead(n.id);await refresh();}}
 return <main className="admin-page min-h-screen bg-slate-50 p-5 md:p-8"><AdminMobileTopBar/><div className="mx-auto max-w-5xl"><div className="flex flex-wrap items-end justify-between gap-3"><div><Link href="/admin" className="font-bold teal">‹ Dashboard</Link><h1 className="mt-2 text-4xl font-black">Central de <span className="teal">notificações</span></h1><p className="muted mt-1">Novos agendamentos, pedidos e cancelamentos em um só lugar.</p></div>{items.some(n=>!n.readAt)&&<button className="primary px-4 py-3" onClick={readAll}>Marcar todas como lidas</button>}</div>
 {error&&<div className="mt-4 rounded-2xl bg-red-50 p-4 font-bold text-red-700">⚠ {error}</div>}
 {loading?<div className="card mt-5 p-5 font-bold">Carregando...</div>:<div className="mt-5 space-y-3">{items.map(n=><button key={n.id} onClick={()=>read(n)} className={`admin-mobile-card block w-full text-left ${!n.readAt?"ring-2 ring-teal-100":""}`}><div className="flex gap-3"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-teal-50 text-2xl">{icon(n.kind)}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h2 className="font-black">{n.title}</h2>{!n.readAt&&<span className="pill">Nova</span>}</div><p className="mt-1 text-sm leading-relaxed text-slate-600">{n.body}</p><p className="mt-2 text-xs text-slate-400">{new Date(n.createdAt).toLocaleString("pt-BR")}</p></div></div></button>)}{!items.length&&<div className="card p-6 text-center text-slate-500">Nenhuma notificação por enquanto.</div>}</div>}</div><AdminMobileNav/></main>
}
