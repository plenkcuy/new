import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

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
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    // "/" tidak punya halaman sendiri; middleware tetap menjaga /dashboard.
    return [{ source: "/", destination: "/dashboard", permanent: false }];
  },
};

export default nextConfig;
