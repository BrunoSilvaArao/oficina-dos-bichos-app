"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import BrandHeader from "@/components/BrandHeader";
import MobilePage from "@/components/MobilePage";
import { backend } from "@/lib/backend";
import { CartItem, storage } from "@/lib/storage";

const money=(v:number)=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

export default function CartPage(){
  const [items,setItems]=useState<CartItem[]>([]);const [delivery,setDelivery]=useState("retirada");const [payment,setPayment]=useState("PIX");const [done,setDone]=useState(false);const [orderId,setOrderId]=useState("");const [error,setError]=useState("");const [loading,setLoading]=useState(false);
  const [address,setAddress]=useState({street:"",number:"",neighborhood:"",city:"",cep:"",complement:"",reference:""});
  useEffect(()=>setItems(storage.cart.get()),[]);
  function save(next:CartItem[]){setItems(next);storage.cart.set(next)}
  function change(slug:string,d:number){save(items.map(x=>x.slug===slug?{...x,qty:Math.max(1,x.qty+d)}:x))}
  function remove(slug:string){save(items.filter(x=>x.slug!==slug))}
  const subtotal=useMemo(()=>items.reduce((s,x)=>s+x.price*x.qty,0),[items]);const fee=delivery==="entrega"?8:0;const total=subtotal+fee;
  async function finish(){
    if(!items.length)return;setError("");
    if(delivery==="entrega"&&(!address.street.trim()||!address.number.trim()||!address.neighborhood.trim()||!address.city.trim()||!address.cep.trim())){setError("Preencha rua, número, bairro, cidade e CEP para entrega.");return;}
    try{
      setLoading(true);
      if(backend.configured()&&!(await backend.session())){window.location.href="/login";return;}
      const order:any=await backend.placeOrder(items.map(x=>({slug:x.slug,quantity:x.qty})),delivery,payment,delivery==="entrega"?address:undefined);
      setOrderId(order?.id||"");setDone(true);storage.cart.set([]);setItems([]);
    }catch(e){const msg=e instanceof Error?e.message:"Não foi possível finalizar o pedido.";setError(msg.includes("INSUFFICIENT_STOCK")?"Um dos produtos não possui mais estoque suficiente. Volte à loja e atualize o carrinho.":msg.includes("DELIVERY_ADDRESS_REQUIRED")?"Preencha o endereço completo para entrega.":msg);}finally{setLoading(false);}
  }
  return <MobilePage><BrandHeader back/><div className="px-5 pb-4"><h1 className="mt-2 text-4xl font-black">Seu <span className="teal">carrinho</span></h1>
  {done&&<div className="mt-4 rounded-2xl bg-green-50 p-4 font-bold text-green-700">✓ Pedido registrado com sucesso.{orderId&&<span className="mt-1 block text-sm">Código: {orderId.slice(0,8).toUpperCase()}</span>}<span className="mt-1 block text-sm">A clínica já consegue visualizar esse pedido no painel administrativo.</span></div>}{error&&<div className="mt-4 rounded-2xl bg-red-50 p-4 font-bold text-red-700">⚠ {error}</div>}
  {items.length===0&&!done?<div className="card mt-5 p-6 text-center"><div className="text-6xl">🛒</div><h2 className="mt-3 text-xl font-black">Carrinho vazio</h2><Link href="/loja" className="primary mt-4 block py-3">Voltar para a loja</Link></div>:!done&&<><div className="mt-4 space-y-3">{items.map(x=><div key={x.slug} className="card flex items-center gap-3 p-4"><div className="text-4xl">{x.icon}</div><div className="flex-1"><p className="font-black">{x.name}</p><p className="teal font-black">{money(x.price*x.qty)}</p><div className="mt-2 flex items-center gap-2"><button onClick={()=>change(x.slug,-1)} className="qty">−</button><span className="font-black">{x.qty}</span><button onClick={()=>change(x.slug,1)} className="qty">+</button></div></div><button onClick={()=>remove(x.slug)} className="text-xl">🗑️</button></div>)}</div>
  <h2 className="section-title mt-5">Forma de recebimento</h2><div className="mt-2 grid grid-cols-2 gap-2">{[["retirada","Retirada na clínica"],["entrega","Entrega"]].map(([v,l])=><button key={v} onClick={()=>setDelivery(v)} className={`rounded-2xl border-2 p-3 font-bold ${delivery===v?"border-teal-500 bg-teal-50":"border-slate-100 bg-white"}`}>{l}</button>)}</div>
  {delivery==="entrega"&&<div className="card mt-4 p-5"><h2 className="section-title">Endereço de entrega</h2><p className="muted mt-1 text-sm">Os dados ficam salvos junto com este pedido.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="sm:col-span-2"><span className="field-label">Rua *</span><input className="field" value={address.street} onChange={e=>setAddress({...address,street:e.target.value})}/></label><label><span className="field-label">Número *</span><input className="field" value={address.number} onChange={e=>setAddress({...address,number:e.target.value})}/></label><label><span className="field-label">Bairro *</span><input className="field" value={address.neighborhood} onChange={e=>setAddress({...address,neighborhood:e.target.value})}/></label><label><span className="field-label">Cidade *</span><input className="field" value={address.city} onChange={e=>setAddress({...address,city:e.target.value})}/></label><label><span className="field-label">CEP *</span><input className="field" value={address.cep} onChange={e=>setAddress({...address,cep:e.target.value})}/></label><label className="sm:col-span-2"><span className="field-label">Complemento</span><input className="field" value={address.complement} onChange={e=>setAddress({...address,complement:e.target.value})}/></label><label className="sm:col-span-2"><span className="field-label">Ponto de referência</span><input className="field" value={address.reference} onChange={e=>setAddress({...address,reference:e.target.value})}/></label></div></div>}
  <h2 className="section-title mt-5">Pagamento</h2><div className="mt-2 grid grid-cols-3 gap-2">{["PIX","Cartão","Dinheiro"].map(x=><button key={x} onClick={()=>setPayment(x)} className={`rounded-2xl border-2 p-3 font-bold ${payment===x?"border-teal-500 bg-teal-50":"border-slate-100 bg-white"}`}>{x}</button>)}</div>
  <div className="card mt-5 p-5"><div className="flex justify-between"><span>Subtotal</span><b>{money(subtotal)}</b></div><div className="mt-2 flex justify-between"><span>Entrega</span><b className="text-green-600">{delivery==="retirada"?"Grátis":money(fee)}</b></div><div className="mt-4 flex justify-between border-t pt-4 text-xl"><b>Total</b><b className="teal">{money(total)}</b></div></div><button disabled={loading} onClick={finish} className="primary mt-4 w-full py-4 text-lg disabled:opacity-60">{loading?"Finalizando...":"Finalizar pedido"}</button></>}
  </div></MobilePage>;
}
