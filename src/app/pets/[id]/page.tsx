"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import BrandHeader from "@/components/BrandHeader";
import MobilePage from "@/components/MobilePage";
import { Pet, storage } from "@/lib/storage";

const base: Record<string, Pet> = {
  luna: { id: "luna", name: "Luna", species: "Gato", breed: "Gata SRD", age: "2 anos", weight: "4,5 kg" },
};

export default function PetDetailPage(){
  const {id}=useParams<{id:string}>();
  const [pet,setPet]=useState<Pet|null>(null);
  useEffect(()=>{setPet(base[id] || storage.pets.get().find(p=>p.id===id) || null)},[id]);
  if(!pet) return <MobilePage><BrandHeader back/><div className="px-5"><div className="card mt-5 p-6 text-center"><div className="text-5xl">🐾</div><h1 className="mt-3 text-2xl font-black">Pet não encontrado</h1><Link href="/pets" className="primary mt-4 block py-3">Voltar para meus pets</Link></div></div></MobilePage>;
  return <MobilePage><BrandHeader back/><div className="px-5 pb-4"><h1 className="mt-2 text-4xl font-black">Perfil do <span className="teal">pet</span></h1><section className="card mt-4 p-5"><div className="flex items-center gap-4"><div className="grid h-24 w-24 place-items-center rounded-full bg-teal-50 text-6xl">{pet.species==="Gato"?"🐱":"🐶"}</div><div><h2 className="text-3xl font-black">{pet.name}</h2><p className="muted">{pet.breed}</p><p className="muted mt-1">{pet.age} · {pet.weight}</p></div></div></section><div className="mt-4 grid grid-cols-2 gap-3"><div className="card p-4"><p className="font-black">Alergias</p><p className="muted mt-1">Nenhuma cadastrada</p></div><div className="card p-4"><p className="font-black">Vacinas</p><p className="muted mt-1">Sem registros nesta demonstração</p></div><div className="card p-4"><p className="font-black">Consultas</p><p className="muted mt-1">Histórico será sincronizado com o banco</p></div><div className="card p-4"><p className="font-black">Medicamentos</p><p className="muted mt-1">Nenhum cadastrado</p></div></div><Link href={`/agenda/novo?pet=${encodeURIComponent(pet.name)}`} className="primary mt-5 block py-4 text-center">Agendar atendimento</Link></div></MobilePage>;
}
