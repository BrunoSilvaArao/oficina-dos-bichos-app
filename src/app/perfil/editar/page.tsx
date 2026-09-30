"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BrandHeader from "@/components/BrandHeader";
import MobilePage from "@/components/MobilePage";
import { storage } from "@/lib/storage";
export default function EditProfile(){const router=useRouter(); const [form,setForm]=useState({name:"",phone:"",email:"",city:""}); useEffect(()=>setForm(storage.profile.get()),[]); function submit(e:FormEvent){e.preventDefault();storage.profile.set(form);router.push("/perfil")}; return <MobilePage><BrandHeader back/><div className="px-5"><h1 className="mt-2 text-4xl font-black">Editar <span className="teal">perfil</span></h1><form onSubmit={submit} className="card mt-5 space-y-4 p-5">{([['name','Nome'],['phone','Telefone'],['email','E-mail'],['city','Cidade']] as const).map(([k,l])=><label className="block" key={k}><span className="field-label">{l}</span><input required className="field" value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/></label>)}<button className="primary w-full py-4">Salvar alterações</button></form></div></MobilePage>}
