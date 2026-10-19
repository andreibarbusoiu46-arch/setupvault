import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/env";

/**
 * Only the pages a search engine should ever land on.
 *
 * Everything behind authentication is deliberately absent: those pages render
 * nothing without a session, so an indexed URL would be a dead end for anyone
 * arriving from a result. The auth screens are excluded for the same reason —
 * a sign-in form has no business ranking for anything.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteUrl();
  const now = new Date();

  return [
    {
      url: origin,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
