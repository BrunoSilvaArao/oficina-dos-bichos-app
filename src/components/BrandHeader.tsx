"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect,useState } from "react";
import { useRouter } from "next/navigation";
import { backend,BackendNotification } from "@/lib/backend";

export default function BrandHeader({ back = false }: { back?: boolean }) {
  const [notifications,setNotifications]=useState(false);
  const [items,setItems]=useState<BackendNotification[]>([]);
  const router=useRouter();
  useEffect(()=>{(async()=>{if(!backend.configured()||!(await backend.session()))return;setItems((await backend.notifications("client")).slice(0,4));})().catch(()=>{});},[]);
  const unread=items.filter(n=>!n.readAt).length;
  async function toggle(){setNotifications(v=>!v);if(!notifications&&items.some(n=>!n.readAt)){await backend.markAllNotificationsRead("client").catch(()=>{});setItems(c=>c.map(n=>({...n,readAt:n.readAt||new Date().toISOString()})));}}
  return <header className="relative flex items-center justify-between gap-2 px-4 pt-4 pb-3"><div className="flex min-w-0 flex-1 items-center gap-2">{back&&<button onClick={()=>router.back()} aria-label="Voltar" className="grid h-10 w-8 shrink-0 place-items-center text-3xl font-black">‹</button>}<Image src="/brand-header.jpg" alt="Oficina dos Bichos" width={270} height={65} className="h-12 w-auto max-w-[195px] object-contain object-left sm:max-w-[240px]" priority/></div><div className="flex shrink-0 gap-2"><button onClick={toggle} aria-label="Notificações" className="relative grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-base">🔔{unread>0&&<span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">{unread>9?"9+":unread}</span>}</button><a aria-label="WhatsApp" className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-base" href={`https://wa.me/${(process.env.NEXT_PUBLIC_CLINIC_WHATSAPP||"5535999999999").replace(/\D/g,"")}`} target="_blank" rel="noreferrer">💬</a></div>{notifications&&<div className="card absolute right-4 top-[64px] z-50 w-[300px] p-3 text-sm"><div className="flex items-center justify-between"><p className="font-black">Notificações</p><Link href="/notificacoes" onClick={()=>setNotifications(false)} className="font-bold teal">Ver todas</Link></div><div className="mt-2 space-y-2">{items.map(n=><div key={n.id} className="rounded-xl bg-slate-50 p-3"><p className="font-black">{n.kind==="order"?"📦":"📅"} {n.title}</p><p className="mt-1 line-clamp-2 text-xs text-slate-500">{n.body}</p></div>)}{!items.length&&<p className="muted p-2">Nenhuma atualização por enquanto.</p>}</div></div>}</header>;
}
