import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteUrl();
  const lastModified = new Date("2026-08-30T00:00:00+08:00");
  return [
    {
      url: origin,
      lastModified,
      changeFrequency: "monthly",
      priority: 1,
      alternates: { languages: { "id-ID": origin } },
    },
    {
      url: `${origin}/join`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: { languages: { "id-ID": `${origin}/join` } },
    },
    {
      url: `${origin}/terms`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.5,
      alternates: { languages: { "id-ID": `${origin}/terms` } },
    },
  ];
}
