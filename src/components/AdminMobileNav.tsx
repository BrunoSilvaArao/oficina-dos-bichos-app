"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  ["/admin", "⌂", "Início"],
  ["/admin/agenda", "📅", "Agenda"],
  ["/admin/horarios", "🕐", "Horários"],
  ["/admin/pedidos", "📦", "Pedidos"],
  ["/admin/produtos", "🛍️", "Produtos"],
] as const;

export default function AdminMobileNav(){
  const pathname=usePathname();
  return <nav className="admin-mobile-nav">{items.map(([href,icon,label])=>{
    const active=href==="/admin"?pathname==="/admin":pathname.startsWith(href);
    return <Link key={href} href={href} className={`admin-mobile-nav-item ${active?"is-active":""}`}><span>{icon}</span><small>{label}</small></Link>;
  })}</nav>
}
