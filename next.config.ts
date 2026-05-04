import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@ominity/api-module-forms"],
  webpack(config) {
    config.resolve ??= {};
    config.resolve.conditionNames = [
      "@ominity/api-modules-template/source",
      ...(config.resolve.conditionNames ?? []),
    ];
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
      ".cjs": [".cts", ".cjs"],
    };

    return config;
  },
};

export default nextConfig;
