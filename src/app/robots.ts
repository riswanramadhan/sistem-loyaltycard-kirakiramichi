import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/join"],
      disallow: ["/admin/", "/loyalty/", "/auth/", "/configuration"],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
