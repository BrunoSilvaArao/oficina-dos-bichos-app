"use client";

import Link from "next/link";

type Props = {
  unread?: number;
};

export default function AdminMobileTopBar({ unread = 0 }: Props) {
  return (
    <div className="admin-mobile-topbar admin-mobile-only">
      <Link href="/admin" className="admin-mobile-brand" aria-label="Ir para o painel administrativo">
        <span aria-hidden="true">🐾</span>
        <span>Oficina dos Bichos</span>
      </Link>
      <Link href="/admin/notificacoes" className="admin-mobile-bell" aria-label="Abrir notificações">
        <span aria-hidden="true">🔔</span>
        {unread > 0 && <span className="admin-mobile-badge">{unread > 9 ? "9+" : unread}</span>}
      </Link>
    </div>
  );
}
