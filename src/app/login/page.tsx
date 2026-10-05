"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { backend } from "@/lib/backend";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "cadastro" | "redefinir">("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryToken, setRecoveryToken] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const type = params.get("type");
    const token = params.get("access_token") || "";
    if (type === "recovery" && token) {
      setRecoveryToken(token);
      setMode("redefinir");
      setMessage("Crie uma nova senha para concluir a recuperação.");
    }
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!backend.configured()) {
      router.push("/");
      return;
    }

    try {
      setLoading(true);
      if (mode === "redefinir") {
        if (!recoveryToken) throw new Error("Link de recuperação inválido ou expirado.");
        if (password.length < 6) throw new Error("A nova senha deve ter pelo menos 6 caracteres.");
        if (password !== confirmPassword) throw new Error("As senhas não conferem.");
        await backend.auth.updatePassword(recoveryToken, password);
        window.history.replaceState(null, "", "/login");
        setRecoveryToken("");
        setPassword("");
        setConfirmPassword("");
        setMode("login");
        setMessage("Senha atualizada. Agora você já pode entrar.");
        return;
      }

      if (mode === "cadastro") {
        const result = await backend.auth.signUp({ name, phone, email, password });
        if (!result?.access_token) {
          setMessage("Cadastro criado. Confira seu e-mail para confirmar a conta e depois faça login.");
          setMode("login");
          return;
        }
      } else {
        await backend.auth.signIn(email, password);
      }
      router.push("/");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Não foi possível continuar.";
      setError(msg.includes("Invalid login") ? "E-mail ou senha incorretos." : msg);
    } finally {
      setLoading(false);
    }
  }

  async function recover() {
    setError("");
    setMessage("");
    if (!email) return setError("Digite seu e-mail primeiro.");
    try {
      setLoading(true);
      await backend.auth.recover(email);
      setMessage("Enviamos as instruções de recuperação para o seu e-mail.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar a recuperação.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-bg">
      <section className="mobile-shell px-6 pb-8">
        <div className="flex justify-center pt-7">
          <Image src="/brand-header.jpg" alt="Oficina dos Bichos" width={360} height={90} className="h-auto w-[80%]" />
        </div>

        <div className="relative mt-4 min-h-56 overflow-hidden rounded-[28px] bg-teal-50 p-5">
          <div className="relative z-10 max-w-[55%]">
            <h1 className="text-4xl font-black">Bem-<span className="teal">vindo!</span></h1>
            <p className="muted mt-3 text-lg">Acesse sua conta para cuidar do seu pet. 🐾</p>
          </div>
          <Image src="/hero-pets.jpg" alt="Pets" width={390} height={320} className="absolute right-[-20px] bottom-0 h-[80%] w-[58%] rounded-3xl object-cover" />
        </div>

        {!backend.configured() && (
          <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-800">
            Modo demonstração ativo. Ao configurar o Supabase, esta tela passa a usar cadastro e login reais.
          </div>
        )}

        <form onSubmit={submit} className="card mt-5 space-y-4 p-5">
          {mode === "cadastro" && (
            <>
              <label className="block"><span className="field-label">Nome</span><input required className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" /></label>
              <label className="block"><span className="field-label">Telefone</span><input className="field" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" /></label>
            </>
          )}

          {mode !== "redefinir" && (
            <label className="block"><span className="field-label">E-mail</span><input required type="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" /></label>
          )}

          <label className="block"><span className="field-label">{mode === "redefinir" ? "Nova senha" : "Senha"}</span><input required minLength={6} type="password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></label>

          {mode === "redefinir" && (
            <label className="block"><span className="field-label">Confirmar nova senha</span><input required minLength={6} type="password" className="field" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" /></label>
          )}

          {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
          {message && <p className="rounded-xl bg-green-50 p-3 text-sm font-bold text-green-700">{message}</p>}

          <button disabled={loading} className="primary w-full py-4 disabled:opacity-60">
            {loading ? "Aguarde..." : !backend.configured() ? "Entrar na demonstração ›" : mode === "login" ? "Entrar ›" : mode === "cadastro" ? "Criar conta ›" : "Salvar nova senha ›"}
          </button>

          {mode === "login" && backend.configured() && <button type="button" onClick={recover} disabled={loading} className="w-full text-sm font-bold teal">Esqueci minha senha</button>}

          {mode !== "redefinir" && (
            <button type="button" onClick={() => { setMode(mode === "login" ? "cadastro" : "login"); setError(""); setMessage(""); }} className="w-full text-sm font-bold text-slate-600">
              {mode === "login" ? "Ainda não tenho conta — criar cadastro" : "Já tenho conta — entrar"}
            </button>
          )}
        </form>
      </section>
    </main>
  );
}
