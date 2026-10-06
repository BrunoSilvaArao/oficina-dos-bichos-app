import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Oficina dos Bichos",
    short_name: "Oficina dos Bichos",
    description: "Clínica veterinária, pet shop e cuidados para o seu pet.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#12b8b2",
    categories: ["medical", "shopping", "lifestyle"],
  };
}
