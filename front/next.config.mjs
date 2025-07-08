/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/:path*`,
      },
    ]
  },
  webpack: (config, { isServer }) => {
    // Configuración específica para XLSX
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };
    }
    
    // Optimización para XLSX
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push('xlsx');
    }
    
    return config;
  },
  experimental: {
    esmExternals: 'loose'
  },
  transpilePackages: ['xlsx']
}

export default nextConfig
