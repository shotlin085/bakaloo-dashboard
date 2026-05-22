/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  // Proxy API requests to backend (optional — can also use direct CORS)
  async rewrites() {
    return [
      // Uncomment below to proxy API calls through Next.js:
      // {
      //   source: "/api/v1/:path*",
      //   destination: "http://localhost:3000/api/v1/:path*",
      // },
    ];
  },
};

export default nextConfig;
