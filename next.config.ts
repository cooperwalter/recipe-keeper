import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gfbjthimmcioretpexay.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Disable build optimizations in development to reduce file system issues
  experimental: {
    // Reduce parallel builds which can cause file conflicts
    workerThreads: false,
    cpus: 1,
  },
  // Only configure webpack if not using Turbopack
  webpack: process.env.TURBOPACK ? undefined : (config, { dev }) => {
    if (dev) {
      // Reduce filesystem pressure in development
      config.cache = {
        type: 'filesystem',
        allowCollectingMemory: true,
        buildDependencies: {
          config: [__filename],
        },
        // Increase cache timeouts
        idleTimeout: 60000,
        idleTimeoutAfterLargeChanges: 10000,
      };
      
      // Disable some optimizations in dev
      config.optimization = {
        ...config.optimization,
        minimize: false,
        splitChunks: false,
      };
    }
    return config;
  },
};

export default nextConfig;
