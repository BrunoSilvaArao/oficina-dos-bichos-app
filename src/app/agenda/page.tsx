import { Suspense } from "react";
import AgendaClient from "./AgendaClient";

export default function AgendaPage() {
  return (
    <Suspense fallback={<main className="app-bg"><section className="mobile-shell min-h-screen" /></main>}>
      <AgendaClient />
    </Suspense>
  );
}
