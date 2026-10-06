import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oficina dos Bichos",
  description: "Web App da Oficina dos Bichos",
  manifest: "/manifest.webmanifest",
  applicationName: "Oficina dos Bichos",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Oficina dos Bichos",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f5f8fa",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
