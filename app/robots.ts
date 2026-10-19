import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/env";

/**
 * The landing page is the only thing worth crawling. The application, its API
 * and the auth screens are closed off: they need a session, they expose no
 * public content, and crawl budget spent on them is crawl budget not spent on
 * the one page that can rank.
 */
export default function robots(): MetadataRoute.Robots {
  const origin = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/auth/",
          "/dashboard",
          "/setups",
          "/favorites",
          "/analytics",
          "/profile",
          "/settings",
          "/login",
          "/signup",
          "/forgot-password",
          "/reset-password",
        ],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
  };
}
