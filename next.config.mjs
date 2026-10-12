// Plain JavaScript (not next.config.ts) on purpose: Hostinger's build servers can't run
// Next.js's native compiler (old glibc), and the WebAssembly fallback can't load a
// TypeScript config. For the same reason `npm run build` uses webpack, not Turbopack.

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // Native Node packages: load them from node_modules at runtime instead of bundling.
  serverExternalPackages: ["mysql2", "nodemailer"],
  experimental: {
    // Every page here is per-user (it reads the session), so we don't ask for
    // instant-navigation validation on all routes; opt in per page with `export const instant`.
    instantInsights: { validationLevel: "manual-warning" },
    // Room for question CSV uploads in admin.
    serverActions: { bodySizeLimit: "2mb" },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
