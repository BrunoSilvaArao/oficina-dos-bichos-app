"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BrandHeader from "@/components/BrandHeader";
import MobilePage from "@/components/MobilePage";
import { backend, BackendPet } from "@/lib/backend";

const DEMO_PETS: BackendPet[] = [
  { id: "thor", name: "Thor", species: "Cachorro", breed: "Golden Retriever", age: "4 anos", weight: "32 kg" },
  { id: "luna", name: "Luna", species: "Gato", breed: "SRD", age: "2 anos", weight: "4,5 kg" },
];

export default function PetsPage() {
  const [pets, setPets] = useState<BackendPet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        if (backend.configured() && !(await backend.session())) {
          window.location.href = "/login";
          return;
        }
        const items = await backend.pets();
        setPets(!backend.configured() && items.length === 0 ? DEMO_PETS : items);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível carregar os pets.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <MobilePage>
      <BrandHeader back />
      <div className="px-5 pb-4">
        <h1 className="mt-2 text-4xl font-black">Meus <span className="teal">pets</span></h1>
        <p className="muted mt-2">Cadastre seus pets e use os dados no agendamento. 🐾</p>

        <div className="mt-4 rounded-[24px] bg-teal-50 p-5">
          <h2 className="text-2xl font-black teal">{loading ? "Carregando..." : `${pets.length} pet${pets.length === 1 ? "" : "s"} cadastrado${pets.length === 1 ? "" : "s"}`}</h2>
          <p className="muted">Os dados ficam vinculados à conta do tutor.</p>
        </div>

        {error && <div className="mt-4 rounded-2xl bg-red-50 p-4 font-bold text-red-700">⚠ {error}</div>}

        {!loading && pets.length === 0 && (
          <div className="card mt-4 p-6 text-center">
            <div className="text-5xl">🐾</div>
            <h2 className="mt-3 text-xl font-black">Nenhum pet cadastrado</h2>
            <p className="muted mt-1">Cadastre o primeiro pet para liberar o fluxo de agendamento.</p>
          </div>
        )}

        <div className="mt-4 space-y-4">
          {pets.map((p) => (
            <article key={p.id} className="card p-4">
              <div className="flex gap-4">
                <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-teal-50 text-5xl">{p.species === "Gato" ? "🐱" : p.species === "Cachorro" ? "🐶" : "🐾"}</div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-2xl font-black">{p.name}</h2>
                  <p className="muted">{p.breed || p.species}</p>
                  <p className="muted mt-1">{[p.age, p.weight].filter(Boolean).join(" · ")}</p>
                  <Link href={`/agenda/novo?petId=${encodeURIComponent(p.id)}&pet=${encodeURIComponent(p.name)}`} className="mt-3 inline-flex rounded-xl bg-amber-50 px-4 py-2 font-bold text-amber-800">Agendar atendimento</Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        <Link href="/pets/novo" className="primary mt-4 block w-full py-4 text-center text-lg">＋ Adicionar pet</Link>
      </div>
    </MobilePage>
  );
}
