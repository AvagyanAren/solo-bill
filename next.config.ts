import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native addon — must not be bundled into RSC/server chunks or SQLite breaks at runtime.
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],
};

export default nextConfig;
