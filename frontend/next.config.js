/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: '/api/auth/:path*', destination: `${process.env.AUTH_SERVICE_URL}/api/auth/:path*` },
      { source: '/api/documents/:path*', destination: `${process.env.DOCUMENTS_SERVICE_URL}/api/documents/:path*` },
      { source: '/api/mindmaps/:path*', destination: `${process.env.DOCUMENTS_SERVICE_URL}/api/mindmaps/:path*` },
      { source: '/api/shares/:path*', destination: `${process.env.COLLABORATION_SERVICE_URL}/api/shares/:path*` },
      { source: '/api/comments/:path*', destination: `${process.env.COLLABORATION_SERVICE_URL}/api/comments/:path*` },
      { source: '/api/invitations/:path*', destination: `${process.env.COLLABORATION_SERVICE_URL}/api/invitations/:path*` },
    ];
  },
};
module.exports = nextConfig;