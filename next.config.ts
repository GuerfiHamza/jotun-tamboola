import type { NextConfig } from 'next';

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
      "worker-src 'self' blob:",
      "frame-src https://challenges.cloudflare.com",
      "frame-ancestors 'none'",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self' https://challenges.cloudflare.com",
      "img-src 'self' data: blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  // pdfkit loads its .afm font files from node_modules at runtime —
  // bundling breaks those paths (ENOENT Helvetica.afm). Keep them external.
  serverExternalPackages: ['pdfkit', 'exceljs', 'sharp'],
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default nextConfig;