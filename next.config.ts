import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SUPABASE_INPUT_BUCKET: process.env.NEXT_PUBLIC_SUPABASE_INPUT_BUCKET,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gmymedqrfxbjlgohuqoo.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'replicate.delivery',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    turbo: {
      rules: {
        "*.svg": {
          loaders: ["@svgr/webpack"],
          as: "*.js",
        },
      },
    },
  },
};

export default nextConfig;
