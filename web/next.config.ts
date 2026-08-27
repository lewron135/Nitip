import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * RainbowKit menarik @coinbase/cdp-sdk (lewat konektor Base Account) yang
   * berisi `import()` dinamis opsional ke paket pembayaran `@x402/*` yang
   * TIDAK terpasang dan memang tidak kita pakai (kita tidak memakai fitur
   * x402 Coinbase). Webpack/Turbopack mencoba me-resolve import itu secara
   * statis saat build dan gagal. Menjadikannya "external" membuat Node
   * me-resolve-nya saat runtime saja — dan kode itu sendiri sudah dibungkus
   * try/catch di SDK-nya, jadi tidak pernah benar-benar dipanggil di alur kita.
   */
  serverExternalPackages: ["@coinbase/cdp-sdk", "@base-org/account"]
};

export default nextConfig;
