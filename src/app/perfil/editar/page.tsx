"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BrandHeader from "@/components/BrandHeader";
import MobilePage from "@/components/MobilePage";
import { backend } from "@/lib/backend";

export default function EditProfile() {
  const router = useRouter();
  const [form, setForm] = useState({ full_name: "", phone: "", city: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (backend.configured() && !(await backend.session())) return router.replace("/login");
      const p = await backend.profile();
      if (p) setForm({ full_name: p.full_name || "", phone: p.phone || "", city: p.city || "" });
      setLoading(false);
    })().catch((err) => { setError(err instanceof Error ? err.message : "Erro ao carregar perfil."); setLoading(false); });
  }, [router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      await backend.updateProfile(form);
      router.push("/perfil");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
      setLoading(false);
    }
  }

  return (
    <MobilePage>
      <BrandHeader back />
      <div className="px-5">
        <h1 className="mt-2 text-4xl font-black">Editar <span className="teal">perfil</span></h1>
        <form onSubmit={submit} className="card mt-5 space-y-4 p-5">
          <label className="block"><span className="field-label">Nome</span><input required className="field" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></label>
          <label className="block"><span className="field-label">Telefone</span><input className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          <label className="block"><span className="field-label">Cidade</span><input className="field" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label>
          {error && <div className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">⚠ {error}</div>}
          <button disabled={loading} className="primary w-full py-4 disabled:opacity-60">{loading ? "Aguarde..." : "Salvar alterações"}</button>
        </form>
      </div>
    </MobilePage>
  );
}
