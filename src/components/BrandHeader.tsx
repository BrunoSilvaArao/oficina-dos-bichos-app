"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BrandHeader({ back = false }: { back?: boolean }) {
  const [notifications, setNotifications] = useState(false);
  const router = useRouter();
  return (
    <header className="relative flex items-center justify-between gap-2 px-4 pt-4 pb-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {back && <button onClick={() => router.back()} aria-label="Voltar" className="grid h-10 w-8 shrink-0 place-items-center text-3xl font-black">‹</button>}
        <Image src="/brand-header.jpg" alt="Oficina dos Bichos" width={270} height={65} className="h-12 w-auto max-w-[195px] object-contain object-left sm:max-w-[240px]" priority />
      </div>
      <div className="flex shrink-0 gap-2">
        <button onClick={() => setNotifications((v) => !v)} aria-label="Notificações" className="grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-slate-100 text-base">🔔</button>
        <a aria-label="WhatsApp" className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-base" href="https://wa.me/5535999911502" target="_blank" rel="noreferrer">💬</a>
      </div>
      {notifications && (
        <div className="card absolute right-4 top-[64px] z-50 w-[260px] p-4 text-sm">
          <p className="font-black">Notificações</p>
          <p className="muted mt-2">💉 Lembrete: confira as próximas vacinas dos seus pets.</p>
          <p className="muted mt-2">📅 Seus agendamentos aparecerão aqui.</p>
        </div>
      )}
    </header>
  );
}
