import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.tiktokcdn.com", // Dấu ** là wildcard cho mọi subdomain
      },
      {
        protocol: "https",
        hostname: "p16-sign-va.tiktokcdn.com", // Thêm cụ thể domain đang lỗi nếu wildcard chưa bắt được (thường wildcard là đủ)
      },
      {
        protocol: "https",
        hostname: "p16-sign-sg.tiktokcdn.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // Dự phòng nếu sau này login Google
      },
      {
        protocol: "https",
        hostname: "ui-avatars.com", // Dự phòng cho avatar mặc định
      }
    ],
  },
};

export default nextConfig;
