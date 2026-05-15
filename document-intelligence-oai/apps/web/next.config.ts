import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@marvicqui/shared-auth",
    "@marvicqui/shared-db",
    "@marvicqui/shared-ui",
    "@marvicqui/shared-agents",
    "@marvicqui/shared-notifications",
    "@marvicqui/cfdi",
    "@marvicqui/laboral",
    "@marvicqui/contratos"
  ]
};

export default nextConfig;
