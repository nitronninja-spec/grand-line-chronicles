import type { NextConfig } from "next";

// EXPORT_STATIC=1 produit un site 100 % statique dans out/ (pour un hébergement sans Node,
// type O2switch). Sans la variable, le build reste celui de Vercel.
const exportStatique = process.env.EXPORT_STATIC === '1'

const nextConfig: NextConfig = {
  ...(exportStatique ? { output: 'export' as const, trailingSlash: true, distDir: '.next-export' } : {}),
};

export default nextConfig;
