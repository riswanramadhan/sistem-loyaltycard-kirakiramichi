import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kira Kira Michi Digital Loyalty Card",
    short_name: "Kira Loyalty",
    description: "Kumpulkan stamp dan buka reward Kira Kira Michi.",
    start_url: "/join",
    display: "standalone",
    background_color: "#fbfaf9",
    theme_color: "#ed2024",
    lang: "id-ID",
    categories: ["lifestyle", "shopping"],
    icons: [
      {
        src: "/kira-kira-michi-logo.png",
        sizes: "any",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
