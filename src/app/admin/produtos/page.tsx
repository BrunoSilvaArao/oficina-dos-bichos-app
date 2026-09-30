"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Product, slugifyProduct, storage } from "@/lib/storage";

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const CATEGORIES = ["Rações", "Brinquedos", "Acessórios", "Farmácia", "Higiene", "Outros"];

export default function AdminProdutosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Rações");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("0");
  const [icon, setIcon] = useState("🐾");
  const [image, setImage] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");

  function refresh() {
    setProducts(storage.products.get());
  }

  useEffect(() => { refresh(); }, []);

  function clearForm() {
    setEditingSlug(null);
    setName(""); setCategory("Rações"); setPrice(""); setStock("0"); setIcon("🐾"); setImage(""); setDescription("");
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const numericPrice = Number(price.replace(",", "."));
    const numericStock = Math.max(0, Number(stock) || 0);
    if (!name.trim() || !Number.isFinite(numericPrice) || numericPrice <= 0) return;

    if (editingSlug) {
      const next = products.map((p) => p.slug === editingSlug ? {
        ...p,
        name: name.trim(), category, price: numericPrice, stock: numericStock,
        icon: icon.trim() || "🐾", image: image || undefined, description: description.trim(),
      } : p);
      storage.products.set(next);
      setProducts(next);
      setMessage("Produto atualizado na loja.");
    } else {
      let slug = slugifyProduct(name) || `produto-${Date.now()}`;
      if (products.some((p) => p.slug === slug)) slug = `${slug}-${Date.now()}`;
      const product: Product = {
        slug, name: name.trim(), category, price: numericPrice, stock: numericStock,
        icon: icon.trim() || "🐾", image: image || undefined, description: description.trim() || "Produto disponível na Oficina dos Bichos.", active: true,
      };
      const next = [...products, product];
      storage.products.set(next);
      setProducts(next);
      setMessage("Produto adicionado à Loja Pet.");
    }
    clearForm();
    window.setTimeout(() => setMessage(""), 3000);
  }


  function chooseImage(file?: File) {
    if (!file) return;
    if (file.size > 900_000) {
      setMessage("Para esta versão de demonstração, use uma imagem com menos de 900 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  function edit(p: Product) {
    setEditingSlug(p.slug); setName(p.name); setCategory(p.category); setPrice(String(p.price).replace(".", ","));
    setStock(String(p.stock)); setIcon(p.icon); setImage(p.image || ""); setDescription(p.description);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleActive(slug: string) {
    const next = products.map((p) => p.slug === slug ? { ...p, active: !p.active } : p);
    storage.products.set(next); setProducts(next);
  }

  function remove(slug: string) {
    if (!window.confirm("Excluir este produto do catálogo?")) return;
    const next = products.filter((p) => p.slug !== slug);
    storage.products.set(next); setProducts(next);
  }

  return (
    <main className="min-h-screen bg-slate-50 p-5 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Link href="/admin" className="font-bold teal">‹ Dashboard</Link>
            <h1 className="mt-2 text-4xl font-black">Produtos da <span className="teal">Loja Pet</span></h1>
            <p className="mt-1 text-slate-500">Cadastre produtos, preços, estoque e o que ficará visível para o cliente.</p>
          </div>
          <Link href="/loja" className="primary px-5 py-3">Abrir loja do cliente</Link>
        </div>

        {message && <div className="mt-4 rounded-2xl bg-green-50 p-4 font-bold text-green-700">✓ {message}</div>}

        <section className="card mt-5 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="section-title">{editingSlug ? "Editar produto" : "Novo produto"}</h2>
            {editingSlug && <button onClick={clearForm} className="rounded-xl bg-slate-100 px-4 py-2 font-bold">Cancelar edição</button>}
          </div>
          <form onSubmit={submit} className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label><span className="field-label">Nome do produto</span><input className="field" value={name} onChange={(e) => setName(e.target.value)} required /></label>
            <label><span className="field-label">Categoria</span><select className="field" value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label><span className="field-label">Preço (R$)</span><input className="field" inputMode="decimal" placeholder="49,90" value={price} onChange={(e) => setPrice(e.target.value)} required /></label>
            <label><span className="field-label">Estoque</span><input className="field" type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} /></label>
            <label><span className="field-label">Ícone/emoji</span><input className="field" value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="🐾" /></label>
            <label><span className="field-label">Foto do produto (opcional)</span><input className="field" type="file" accept="image/*" onChange={(e) => chooseImage(e.target.files?.[0])} /></label>
            {image && <div className="md:col-span-2 xl:col-span-3"><div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3"><img src={image} alt="Prévia" className="h-20 w-20 rounded-xl object-cover"/><div><b>Prévia da foto</b><br/><button type="button" onClick={() => setImage("")} className="mt-1 text-sm font-bold text-red-600">Remover foto</button></div></div></div>}
            <label className="md:col-span-2 xl:col-span-3"><span className="field-label">Descrição</span><textarea className="field min-h-24" value={description} onChange={(e) => setDescription(e.target.value)} /></label>
            <button className="primary px-6 py-3 md:w-fit">{editingSlug ? "Salvar alterações" : "＋ Adicionar produto"}</button>
          </form>
        </section>

        <section className="card mt-5 overflow-x-auto p-5">
          <div className="flex justify-between gap-3"><h2 className="section-title">Catálogo atual</h2><span className="pill">{products.length} produtos</span></div>
          <table className="mt-4 w-full min-w-[900px] text-left">
            <thead className="text-sm text-slate-500"><tr><th className="py-3">PRODUTO</th><th>CATEGORIA</th><th>PREÇO</th><th>ESTOQUE</th><th>VISÍVEL</th><th>AÇÕES</th></tr></thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.slug} className="border-t border-slate-100">
                  <td className="py-4"><div className="flex items-center gap-3">{p.image ? <img src={p.image} alt="" className="h-12 w-12 rounded-xl object-cover"/> : <span className="text-2xl">{p.icon}</span>}<b>{p.name}</b></div></td>
                  <td>{p.category}</td><td className="font-black teal">{money(p.price)}</td>
                  <td><span className={p.stock <= 5 ? "font-black text-red-500" : "font-bold"}>{p.stock}</span></td>
                  <td><button onClick={() => toggleActive(p.slug)} className={`rounded-full px-3 py-1 text-xs font-black ${p.active ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>{p.active ? "Sim" : "Não"}</button></td>
                  <td><div className="flex gap-2"><button onClick={() => edit(p)} className="rounded-xl bg-teal-50 px-3 py-2 font-bold teal">Editar</button><button onClick={() => remove(p.slug)} className="rounded-xl bg-red-50 px-3 py-2 font-bold text-red-600">Excluir</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
