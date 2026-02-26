import type { NextConfig } from "next";

/**
 * Content Security Policy
 *
 * Why unsafe-eval and unsafe-inline are needed:
 * - unsafe-eval: Required by Turbopack during development for HMR
 * - unsafe-inline: Required by Privy auth modal and Next.js hydration scripts
 *
 * Production consideration: Consider using nonces for stricter CSP if needed.
 */
const chatApiOrigin = (() => {
  const value = process.env.NEXT_PUBLIC_CHAT_API_URL;
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
})();

const connectSrc = [
  "'self'",
  "https://co.build",
  "https://docs.co.build",
  "https://*.vercel.app",
  "https://*.vercel-insights.com",
  "https://vitals.vercel-insights.com",
  "https://auth.privy.io",
  "wss://relay.walletconnect.com",
  "wss://relay.walletconnect.org",
  "wss://www.walletlink.org",
  "https://*.rpc.privy.systems",
  "https://explorer-api.walletconnect.com",
  "https://*.g.alchemy.com",
  "wss://*.g.alchemy.com",
  "https://chat-api.co.build",
  "http://localhost:4000",
  "http://127.0.0.1:4000",
  chatApiOrigin,
]
  .filter(Boolean)
  .join(" ");

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com https://va.vercel-scripts.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https:;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'self' https://auth.privy.io;
  child-src https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org;
  frame-src https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org https://challenges.cloudflare.com;
  connect-src ${connectSrc};
  worker-src 'self' blob:;
  manifest-src 'self';
`
  .replace(/\s{2,}/g, " ")
  .trim();

const nextConfig: NextConfig = {
  cacheComponents: false,
  webpack(config) {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@react-native-async-storage/async-storage": false,
    };
    return config;
  },
  // Turbopack for dev (fast HMR)
  turbopack: {
    resolveAlias: {
      pino: "pino/browser.js",
      "pino-pretty": "pino/browser.js",
    },
  },
  images: {
    remotePatterns: [
      { hostname: "imagedelivery.net" },
      { hostname: "i.imgur.com" },
      { hostname: "res.cloudinary.com" },
      { hostname: "pbs.twimg.com" },
      { hostname: "warpcast.com" },
      { hostname: "i.seadn.io" },
      { hostname: "media.discordapp.net" },
      { hostname: "cdn.discordapp.com" },
      { hostname: "img.seadn.io" },
      { hostname: "images.neynar.com" },
      { hostname: "img.neynar.com" },
      { hostname: "*.farcaster.xyz" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader,
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
