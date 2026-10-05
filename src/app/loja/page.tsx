"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BrandHeader from "@/components/BrandHeader";
import MobilePage from "@/components/MobilePage";
import { backend, BackendProduct } from "@/lib/backend";
import { storage } from "@/lib/storage";

const money=(v:number)=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

export default function LojaPage(){
  const [products,setProducts]=useState<BackendProduct[]>([]);const [category,setCategory]=useState("Todos");const [search,setSearch]=useState("");const [count,setCount]=useState(0);const [message,setMessage]=useState("");const [error,setError]=useState("");const [loading,setLoading]=useState(true);
  const updateCart=()=>setCount(storage.cart.get().reduce((s,x)=>s+x.qty,0));
  useEffect(()=>{backend.products(false).then(setProducts).catch(e=>setError(e instanceof Error?e.message:"Não foi possível carregar a loja.")).finally(()=>setLoading(false));updateCart();window.addEventListener("odb-cart-updated",updateCart);return()=>window.removeEventListener("odb-cart-updated",updateCart);},[]);
  const categories=useMemo(()=>["Todos",...Array.from(new Set(products.map(p=>p.category)))],[products]);
  const shown=useMemo(()=>products.filter(p=>(category==="Todos"||p.category===category)&&p.name.toLowerCase().includes(search.toLowerCase())),[products,category,search]);
  function add(p:BackendProduct){if(p.stock<=0)return;storage.cart.add({slug:p.slug,name:p.name,price:p.price,icon:p.icon});setMessage(`${p.name} adicionado ao carrinho.`);setTimeout(()=>setMessage(""),1800);}
  return <MobilePage><BrandHeader back/><div className="px-5 pb-4"><div className="flex items-end justify-between"><div><h1 className="mt-2 text-4xl font-black">Loja <span className="teal">pet</span></h1><p className="muted mt-2">Catálogo atualizado pela própria clínica. 🐾</p></div><Link href="/carrinho" className="relative mb-1 grid h-12 w-12 place-items-center rounded-full bg-teal-50 text-xl">🛒{count>0&&<span className="absolute -right-1 -top-1 grid h-6 min-w-6 place-items-center rounded-full bg-red-500 px-1 text-xs font-black text-white">{count}</span>}</Link></div>
  {message&&<div className="mt-3 rounded-xl bg-green-50 p-3 text-sm font-bold text-green-700">✓ {message}</div>}{error&&<div className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">⚠ {error}</div>}
  <input value={search} onChange={e=>setSearch(e.target.value)} className="mt-4 w-full rounded-full bg-slate-100 px-5 py-4 outline-none" placeholder="🔎 Buscar produtos para o seu pet..."/><div className="mt-3 flex gap-2 overflow-auto pb-1">{categories.map(c=><button key={c} onClick={()=>setCategory(c)} className={`pill whitespace-nowrap ${category===c?"bg-teal-500 text-white":""}`}>{c}</button>)}</div>
  <section className="mt-4 rounded-[24px] bg-gradient-to-r from-teal-100 to-cyan-50 p-5"><p className="text-xs font-black teal">LOJA OFICINA DOS BICHOS</p><h2 className="mt-1 text-3xl font-black">Produtos cadastrados<br/>pela clínica</h2><p className="muted mt-1">Preço, estoque e visibilidade são sincronizados com o painel administrativo.</p></section>
  <div className="mt-5 flex justify-between"><h2 className="section-title">Produtos</h2><Link href="/carrinho" className="teal font-bold">Carrinho ({count}) ›</Link></div>
  {loading?<div className="card mt-3 p-6 text-center font-bold">Carregando produtos...</div>:shown.length===0?<div className="card mt-3 p-6 text-center"><div className="text-4xl">🛍️</div><h3 className="mt-2 font-black">Nenhum produto encontrado</h3></div>:<div className="mt-3 grid grid-cols-2 gap-3">{shown.map(p=><article className="card p-4" key={p.slug}><Link href={`/loja/produto/${p.slug}`} className="block"><div className="grid h-28 place-items-center overflow-hidden rounded-2xl bg-slate-50 text-6xl">{p.image?<img src={p.image} alt={p.name} className="h-full w-full object-cover"/>:p.icon}</div><h3 className="mt-3 font-black">{p.name}</h3><p className="teal mt-2 text-xl font-black">{money(p.price)}</p><p className={`mt-1 text-xs font-bold ${p.stock<=5?"text-red-500":"text-slate-500"}`}>{p.stock>0?`${p.stock} em estoque`:"Sem estoque"}</p></Link><button disabled={p.stock<=0} onClick={()=>add(p)} className="primary mt-3 w-full py-3 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none">{p.stock>0?"＋ Adicionar":"Indisponível"}</button></article>)}</div>}
  </div></MobilePage>;
}
