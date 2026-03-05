/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8000'
    return [
      {
        source: '/api/preview-stream',
        destination: `${backendUrl}/api/preview-stream`,
      },
    ]
  },
}

export default nextConfig
