"use client";

import { useEffect,useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import BrandHeader from "@/components/BrandHeader";
import MobilePage from "@/components/MobilePage";
import { backend,BackendPet } from "@/lib/backend";

export default function PetDetailPage(){const {id}=useParams<{id:string}>();const [pet,setPet]=useState<BackendPet|null>(null);const [loading,setLoading]=useState(true);useEffect(()=>{backend.pets().then(items=>setPet(items.find(p=>p.id===id)||null)).finally(()=>setLoading(false));},[id]);if(loading)return <MobilePage><BrandHeader back/><div className="px-5"><div className="card mt-5 p-6 text-center font-bold">Carregando...</div></div></MobilePage>;if(!pet)return <MobilePage><BrandHeader back/><div className="px-5"><div className="card mt-5 p-6 text-center"><div className="text-5xl">🐾</div><h1 className="mt-3 text-2xl font-black">Pet não encontrado</h1><Link href="/pets" className="primary mt-4 block py-3">Voltar para meus pets</Link></div></div></MobilePage>;return <MobilePage><BrandHeader back/><div className="px-5 pb-4"><h1 className="mt-2 text-4xl font-black">Perfil do <span className="teal">pet</span></h1><section className="card mt-4 p-5"><div className="flex items-center gap-4"><div className="grid h-24 w-24 place-items-center rounded-full bg-teal-50 text-6xl">{pet.species==="Gato"?"🐱":pet.species==="Cachorro"?"🐶":"🐾"}</div><div><h2 className="text-3xl font-black">{pet.name}</h2><p className="muted">{pet.breed||pet.species}</p><p className="muted mt-1">{[pet.age,pet.weight].filter(Boolean).join(" · ")}</p></div></div></section><Link href={`/agenda/novo?petId=${encodeURIComponent(pet.id)}&pet=${encodeURIComponent(pet.name)}`} className="primary mt-5 block py-4 text-center">Agendar atendimento</Link></div></MobilePage>}
