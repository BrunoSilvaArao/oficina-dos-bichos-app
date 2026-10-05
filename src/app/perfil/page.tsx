"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BrandHeader from "@/components/BrandHeader";
import MobilePage from "@/components/MobilePage";
import { backend, BackendPet, BackendProfile } from "@/lib/backend";

export default function PerfilPage() {
  const [profile, setProfile] = useState<BackendProfile | null>(null);
  const [pets, setPets] = useState<BackendPet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (backend.configured() && !(await backend.session())) {
        window.location.href = "/login";
        return;
      }
      const [p, petItems] = await Promise.all([backend.profile(), backend.pets()]);
      setProfile(p);
      setPets(petItems);
      setLoading(false);
    })().catch(() => setLoading(false));
  }, []);

  async function logout() {
    await backend.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <MobilePage>
      <BrandHeader back />
      <div className="px-5 pb-4">
        <h1 className="mt-2 text-4xl font-black">Meu <span className="teal">perfil</span></h1>
        <p className="muted mt-2">Seus dados e seus pets em um só lugar. 🐾</p>

        <section className="card mt-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black">{loading ? "Carregando..." : profile?.full_name || "Cliente"}</h2>
              {profile?.phone && <p className="muted mt-2">📞 {profile.phone}</p>}
              {profile?.city && <p className="muted">📍 {profile.city}</p>}
              {profile?.role && profile.role !== "client" && <span className="pill mt-2 inline-block">{profile.role === "admin" ? "Administrador" : "Equipe"}</span>}
            </div>
            <Link href="/perfil/editar" className="pill">Editar</Link>
          </div>
        </section>

        <div className="mt-5 flex items-center justify-between"><h2 className="section-title">Minha família pet</h2><Link href="/pets/novo" className="teal font-bold">Adicionar +</Link></div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {pets.slice(0, 4).map((pet) => (
            <Link key={pet.id} href={`/agenda/novo?petId=${encodeURIComponent(pet.id)}&pet=${encodeURIComponent(pet.name)}`} className="card p-4">
              <div className="text-4xl">{pet.species === "Gato" ? "🐱" : pet.species === "Cachorro" ? "🐶" : "🐾"}</div>
              <h3 className="mt-2 font-black">{pet.name}</h3>
              <p className="muted text-sm">{pet.breed || pet.species}</p>
            </Link>
          ))}
          {!loading && pets.length === 0 && <Link href="/pets/novo" className="card col-span-2 p-5 text-center font-bold teal">＋ Cadastrar primeiro pet</Link>}
        </div>

        <div className="mt-4 space-y-2">
          <Link href="/pets" className="card flex w-full items-center justify-between p-4 font-bold"><span>Meus pets</span><span>›</span></Link>
          <Link href="/agenda" className="card flex w-full items-center justify-between p-4 font-bold"><span>Meus agendamentos</span><span>›</span></Link>
          <Link href="/carrinho" className="card flex w-full items-center justify-between p-4 font-bold"><span>Meu carrinho</span><span>›</span></Link>
          {profile?.role !== "client" && <Link href="/admin" className="card flex w-full items-center justify-between p-4 font-bold teal"><span>Painel administrativo</span><span>›</span></Link>}
          <button onClick={logout} className="card flex w-full items-center justify-between p-4 font-bold text-red-600"><span>Sair</span><span>›</span></button>
        </div>
      </div>
    </MobilePage>
  );
}
