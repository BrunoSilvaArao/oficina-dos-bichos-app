import { Suspense } from "react";
import NovoAgendamentoClient from "./NovoAgendamentoClient";

export default function NovoAgendamentoPage() {
  return (
    <Suspense fallback={<main className="app-bg"><section className="mobile-shell min-h-screen" /></main>}>
      <NovoAgendamentoClient />
    </Suspense>
  );
}
