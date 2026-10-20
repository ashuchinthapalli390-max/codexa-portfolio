/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  experimental: {
    serverComponentsExternalPackages: ["firebase-admin"],
  },
  async redirects() {
    return [
      {
        source: "/update",
        destination: "/mobile",
        permanent: false,
      },
      {
        source: "/app-update",
        destination: "/mobile",
        permanent: false,
      },
      {
        source: "/download",
        destination: "/mobile",
        permanent: false,
      },
      {
        source: "/downloads",
        destination: "/mobile",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
