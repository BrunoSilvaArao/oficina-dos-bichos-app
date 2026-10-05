"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BrandHeader from "@/components/BrandHeader";
import MobilePage from "@/components/MobilePage";
import { backend } from "@/lib/backend";

export default function NovoPetPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<"Cachorro" | "Gato" | "Outro">("Cachorro");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!backend.configured()) return;
    backend.session().then((session) => { if (!session) router.replace("/login"); });
  }, [router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      setLoading(true);
      await backend.addPet({ name: name.trim(), species, breed: breed.trim(), age: age.trim(), weight: weight.trim() });
      router.push("/pets");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o pet.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MobilePage>
      <BrandHeader back />
      <div className="px-5">
        <h1 className="mt-2 text-4xl font-black">Adicionar <span className="teal">pet</span></h1>
        <form onSubmit={submit} className="card mt-5 space-y-4 p-5">
          <label className="block"><span className="field-label">Nome</span><input required className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do pet" /></label>
          <label className="block"><span className="field-label">Espécie</span><select className="field" value={species} onChange={(e) => setSpecies(e.target.value as typeof species)}><option>Cachorro</option><option>Gato</option><option>Outro</option></select></label>
          <label className="block"><span className="field-label">Raça</span><input className="field" value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="Ex.: Golden Retriever" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label><span className="field-label">Idade</span><input className="field" value={age} onChange={(e) => setAge(e.target.value)} placeholder="Ex.: 4 anos" /></label>
            <label><span className="field-label">Peso</span><input className="field" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Ex.: 32 kg" /></label>
          </div>
          {error && <div className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">⚠ {error}</div>}
          <button disabled={loading} className="primary w-full py-4 disabled:opacity-60">{loading ? "Salvando..." : "Salvar pet"}</button>
        </form>
      </div>
    </MobilePage>
  );
}
