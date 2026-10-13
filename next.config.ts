import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /**
     * Screenshots are served from a private Supabase bucket through short-lived
     * signed URLs. They are rendered with `unoptimized`, since a URL that
     * expires in an hour has nothing to gain from the image cache — this entry
     * simply keeps the host allowed if that ever changes.
     */
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
};

export default nextConfig;
