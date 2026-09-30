"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import BrandHeader from "@/components/BrandHeader";
import MobilePage from "@/components/MobilePage";
import { Product, storage } from "@/lib/storage";

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setProduct(storage.products.get().find((p) => p.slug === slug) || null);
  }, [slug]);

  if (!product) return <MobilePage><BrandHeader back/><div className="px-5"><div className="card mt-5 p-8 text-center"><div className="text-5xl">🛍️</div><h1 className="mt-3 text-2xl font-black">Produto não encontrado</h1><Link href="/loja" className="primary mt-5 inline-flex px-5 py-3">Voltar à loja</Link></div></div></MobilePage>;

  function add() {
    if (!product || product.stock <= 0) return;
    storage.cart.add({ slug: product.slug, name: product.name, price: product.price, icon: product.icon });
    setMessage("Produto adicionado ao carrinho.");
  }

  return <MobilePage><BrandHeader back/><div className="px-5">
    {message && <div className="mt-2 rounded-xl bg-green-50 p-3 text-sm font-bold text-green-700">✓ {message}</div>}
    <div className="card mt-3 grid h-64 place-items-center overflow-hidden bg-slate-50 text-9xl">{product.image ? <img src={product.image} alt={product.name} className="h-full w-full object-cover"/> : product.icon}</div>
    <h1 className="mt-5 text-3xl font-black">{product.name}</h1>
    <p className="teal mt-2 text-3xl font-black">{money(product.price)}</p>
    <p className={`mt-2 font-bold ${product.stock <= 5 ? "text-red-500" : "text-slate-500"}`}>{product.stock > 0 ? `${product.stock} unidades em estoque` : "Produto sem estoque no momento"}</p>
    <p className="muted mt-3 leading-relaxed">{product.description}</p>
    <section className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-teal-50 p-3 text-center text-sm font-bold"><div>💚 Saúde</div><div>✨ Qualidade</div><div>🐾 Bem-estar</div></section>
    <button disabled={product.stock <= 0} onClick={add} className="primary mt-5 w-full py-4 disabled:bg-slate-300 disabled:shadow-none">{product.stock > 0 ? "Adicionar ao carrinho" : "Indisponível"}</button>
    <Link href="/carrinho" className="mt-3 block rounded-2xl border-2 border-teal-500 py-4 text-center font-black teal">Ir para o carrinho</Link>
  </div></MobilePage>;
}
