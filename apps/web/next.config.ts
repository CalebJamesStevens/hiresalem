import path from "node:path"
import { fileURLToPath } from "node:url"
import type { NextConfig } from "next"

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true
  },
  turbopack: {
    root: path.join(dirname, "../..")
  },
  transpilePackages: ["@repo/db"]
}

export default nextConfig
