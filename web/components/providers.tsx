"use client";

/**
 * Satu-satunya tempat provider global dipasang: wagmi → react-query →
 * RainbowKit, urutan ini wajib (§18.2: "wagmi v2 mewajibkan
 * @tanstack/react-query sebagai provider").
 *
 * QueryClient dibuat lewat useState, bukan di luar komponen, supaya tidak
 * dibagi antar request saat SSR (kebocoran data antar pengguna).
 */

import {useState, type ReactNode} from "react";
import {WagmiProvider} from "wagmi";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {RainbowKitProvider, darkTheme, lightTheme} from "@rainbow-me/rainbowkit";
import {wagmiConfig} from "@/lib/chain";

const rainbowKitTheme = {
  lightMode: lightTheme({accentColor: "#2347ff", accentColorForeground: "#ffffff", borderRadius: "medium"}),
  darkMode: darkTheme({accentColor: "#6b86ff", accentColorForeground: "#06080f", borderRadius: "medium"})
};

export function Providers({children}: {children: ReactNode}) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={rainbowKitTheme}>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
