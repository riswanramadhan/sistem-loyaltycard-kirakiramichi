import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteUrl();
  return [
    { url: origin, changeFrequency: "monthly", priority: 1 },
    { url: `${origin}/join`, changeFrequency: "monthly", priority: 0.9 },
  ];
}
