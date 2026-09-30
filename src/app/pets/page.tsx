"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import BrandHeader from "@/components/BrandHeader";
import MobilePage from "@/components/MobilePage";
import { Pet, storage } from "@/lib/storage";

const basePets = [
  { id:"thor", name:"Thor", breed:"Golden Retriever", age:"4 anos", weight:"32 kg", img:"/thor.jpg", vaccine:"18/11", species:"Cachorro" as const },
  { id:"luna", name:"Luna", breed:"Gata SRD", age:"2 anos", weight:"4,5 kg", img:"/thor.jpg", vaccine:"22/03", species:"Gato" as const },
];

export default function PetsPage() {
  const [extra, setExtra] = useState<Pet[]>([]);
  useEffect(()=>setExtra(storage.pets.get()), []);
  const all = [...basePets, ...extra];
  return <MobilePage><BrandHeader back/><div className="px-5 pb-4"><h1 className="mt-2 text-4xl font-black">Meus <span className="teal">pets</span></h1><p className="muted mt-2">Acompanhe a saúde, os cuidados e os próximos compromissos dos seus pets. 🐾</p><div className="mt-4 rounded-[24px] bg-teal-50 p-5"><h2 className="text-2xl font-black teal">{all.length} pets cadastrados</h2><p className="muted">Mantenha os dados sempre atualizados.</p></div>
    <div className="mt-4 space-y-4">{all.map((p:any)=><article key={p.id} className="card p-4"><div className="flex gap-4"><div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full bg-teal-50 text-5xl">{p.img?<Image src={p.img} alt={p.name} width={100} height={100} className="h-full w-full object-cover"/>:(p.species==="Gato"?"🐱":"🐶")}</div><div><h2 className="text-2xl font-black">{p.name}</h2><p className="muted">{p.breed}</p><p className="muted mt-1">{p.age} · {p.weight}</p><div className="mt-2 flex flex-wrap gap-2"><span className="pill bg-green-50 text-green-700">✓ Vacinas em dia</span>{p.vaccine&&<span className="pill">📅 {p.vaccine}</span>}</div></div></div><div className="mt-4 grid grid-cols-3 gap-2"><Link href={`/pets/${p.id}`} className="rounded-xl bg-teal-50 py-3 text-center font-bold">Histórico</Link><Link href={`/pets/${p.id}`} className="rounded-xl bg-sky-50 py-3 text-center font-bold">Vacinas</Link><Link href={`/agenda/novo?pet=${encodeURIComponent(p.name)}`} className="rounded-xl bg-amber-50 py-3 text-center font-bold">Agendar</Link></div></article>)}</div>
    <Link href="/pets/novo" className="primary mt-4 block w-full py-4 text-center text-lg">＋ Adicionar pet</Link>
  </div></MobilePage>;
}
