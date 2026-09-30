"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  ["/", "⌂", "Início"],
  ["/agenda", "▣", "Agenda"],
  ["/pets", "🐾", "Pets"],
  ["/loja", "▱", "Loja"],
  ["/perfil", "◯", "Perfil"],
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-1/2 z-40 flex w-full max-w-[520px] -translate-x-1/2 border-t border-slate-200 bg-white/95 backdrop-blur px-3 py-2">
      {items.map(([href, icon, label]) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link href={href} key={href} className={`flex-1 flex flex-col items-center gap-1 py-1 text-xs font-semibold ${active ? "text-teal-600" : "text-slate-500"}`}>
            <span className={`grid h-8 w-8 place-items-center rounded-xl text-lg ${active ? "bg-teal-50" : ""}`}>{icon}</span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
