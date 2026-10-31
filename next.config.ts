import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const csp = [
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "frame-src 'self' https://*.tradingview.com https://*.tradingview-widget.com",
  "connect-src 'self' https://data-api.binance.vision https://api.binance.com https://fapi.binance.com wss://stream.binance.com:9443 wss://data-stream.binance.vision",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Chromium untuk cadangan Puppeteer: tidak dibundel, tapi berkasnya harus ikut ke fungsi serverless.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  outputFileTracingIncludes: {
    "/[tab]": ["./node_modules/@sparticuz/chromium/bin/**"],
    "/api/cron/prices": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
  async headers() {
    const headers =
      process.env.NODE_ENV === "production" ? [...securityHeaders, { key: "Content-Security-Policy", value: csp }] : securityHeaders;
    return [{ source: "/:path*", headers }];
  },
  async redirects() {
    // "/" tidak punya halaman sendiri; middleware tetap menjaga /dashboard.
    return [{ source: "/", destination: "/dashboard", permanent: false }];
  },
};

export default nextConfig;
