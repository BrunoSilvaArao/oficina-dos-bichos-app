import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oficina dos Bichos",
  description: "Web App da Oficina dos Bichos",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
