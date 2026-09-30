"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import BrandHeader from "@/components/BrandHeader";
import MobilePage from "@/components/MobilePage";
import { storage } from "@/lib/storage";

export default function NovoPetPage(){
  const router=useRouter(); const [name,setName]=useState(""); const [species,setSpecies]=useState<"Cachorro"|"Gato"|"Outro">("Cachorro"); const [breed,setBreed]=useState(""); const [age,setAge]=useState(""); const [weight,setWeight]=useState("");
  function submit(e:FormEvent){e.preventDefault(); storage.pets.add({id:String(Date.now()),name,species,breed,age,weight}); router.push("/pets");}
  return <MobilePage><BrandHeader back/><div className="px-5"><h1 className="mt-2 text-4xl font-black">Adicionar <span className="teal">pet</span></h1><form onSubmit={submit} className="card mt-5 space-y-4 p-5"><label className="block"><span className="field-label">Nome</span><input required className="field" value={name} onChange={e=>setName(e.target.value)} placeholder="Nome do pet"/></label><label className="block"><span className="field-label">Espécie</span><select className="field" value={species} onChange={e=>setSpecies(e.target.value as any)}><option>Cachorro</option><option>Gato</option><option>Outro</option></select></label><label className="block"><span className="field-label">Raça</span><input required className="field" value={breed} onChange={e=>setBreed(e.target.value)} placeholder="Ex.: Golden Retriever"/></label><div className="grid grid-cols-2 gap-3"><label><span className="field-label">Idade</span><input required className="field" value={age} onChange={e=>setAge(e.target.value)} placeholder="Ex.: 4 anos"/></label><label><span className="field-label">Peso</span><input required className="field" value={weight} onChange={e=>setWeight(e.target.value)} placeholder="Ex.: 32 kg"/></label></div><button className="primary w-full py-4">Salvar pet</button></form></div></MobilePage>;
}
