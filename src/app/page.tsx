import Image from "next/image";
import Link from "next/link";
import BrandHeader from "@/components/BrandHeader";
import MobilePage from "@/components/MobilePage";

const services = [
  ["🩺", "Veterinário", "Consultas, vacinas e cuidados de saúde", "Veterinário"],
  ["🚿", "Banho & Tosa", "Seu pet limpinho e cheiroso", "Banho & Tosa"],
  ["🏨", "Hotelzinho", "Conforto e segurança enquanto você viaja", "Hotelzinho"],
  ["🐶", "Creche Pet", "Diversão e socialização", "Creche Pet"],
] as const;

export default function Home() {
  return (
    <MobilePage>
      <BrandHeader />
      <div className="px-4 sm:px-5">
        <section className="relative min-h-[215px] overflow-hidden rounded-[28px] bg-gradient-to-br from-white to-teal-50 px-2 pb-3">
          <div className="relative z-10 max-w-[55%] pt-4">
            <p className="text-[31px] font-black leading-[.98] tracking-tight sm:text-4xl"><span className="text-sky-600">Olá!</span><br/>Como podemos<br/>ajudar hoje?</p>
            <p className="muted mt-3 text-sm leading-snug sm:text-base">Saúde, bem-estar e muito carinho para o seu pet! 🐾</p>
          </div>
          <Image src="/hero-pets.jpg" alt="Cachorro e gato" width={390} height={320} className="absolute right-[-12px] bottom-0 h-[78%] w-[54%] rounded-3xl object-cover" priority />
        </section>

        <Link href="/agenda/novo" className="primary mt-3 flex items-center justify-between px-5 py-4 text-lg sm:text-xl"><span>📅 &nbsp; Agendar horário</span><span>›</span></Link>

        <section className="mt-4 grid grid-cols-2 gap-3">
          {services.map(([icon, title, text, service]) => (
            <Link href={`/agenda/novo?servico=${encodeURIComponent(service)}`} key={title} className="card min-h-36 p-3.5 transition-transform hover:-translate-y-0.5 sm:min-h-40 sm:p-4">
              <div className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-teal-50 text-xl sm:h-12 sm:w-12 sm:text-2xl">{icon}</div>
              <h2 className="font-black text-base sm:text-lg">{title}</h2>
              <p className="muted mt-1 text-xs leading-snug sm:text-sm">{text}</p>
            </Link>
          ))}
          <Link href="/loja" className="card min-h-36 p-3.5"><div className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-teal-50 text-xl">💊</div><h2 className="font-black text-base">Farmácia</h2><p className="muted mt-1 text-xs leading-snug">Medicamentos e saúde</p></Link>
          <Link href="/loja" className="card min-h-36 p-3.5"><div className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-teal-50 text-xl">🛍️</div><h2 className="font-black text-base">Pet Shop</h2><p className="muted mt-1 text-xs leading-snug">Rações, acessórios e muito mais</p></Link>
        </section>

        <section className="relative mt-4 min-h-40 overflow-hidden rounded-[24px] bg-gradient-to-r from-[#dffbfb] to-[#aef0ee] p-5">
          <div className="relative z-10 max-w-[62%]"><p className="text-xs font-black text-teal-700">CUIDE SEMPRE</p><h2 className="section-title mt-1">Vacinação em dia</h2><p className="mt-1 text-sm text-teal-900/80">Protege seu pet e garante uma vida mais longa e saudável.</p><Link href="/agenda/novo?servico=Vacinação" className="mt-3 inline-block rounded-full bg-teal-600 px-5 py-2 font-bold text-white">Agendar ›</Link></div>
          <Image src="/vaccination-dog.jpg" alt="Pet" width={300} height={230} className="absolute right-0 bottom-0 h-full w-[42%] object-cover" />
        </section>

        <section className="mt-5 pb-4"><div className="flex items-center justify-between"><h2 className="section-title">Meus pets</h2><Link href="/pets" className="font-bold teal">Ver todos ›</Link></div><Link href="/pets/thor" className="card mt-3 flex items-center gap-4 p-4"><Image src="/thor.jpg" alt="Thor" width={80} height={80} className="h-20 w-20 rounded-full object-cover" /><div className="min-w-0 flex-1"><h3 className="text-xl font-black">Thor</h3><p className="muted">Golden Retriever</p><span className="pill mt-2 inline-block">📅 Próxima vacina: 18/11</span></div><span className="text-3xl text-slate-400">›</span></Link></section>
      </div>
    </MobilePage>
  );
}
