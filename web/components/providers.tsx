"use client";

/**
 * Satu-satunya tempat provider dipasang.
 *
 * §18.2 masterplan: "wagmi v2 mewajibkan @tanstack/react-query sebagai
 * provider." Melupakan ini menghasilkan galat yang menyebut react-query,
 * bukan wagmi, dan itu membuang waktu lama untuk ditelusuri.
 *
 * Berkas ini `use client` supaya seluruh pohon di bawahnya boleh memakai
 * state. Halaman yang tidak butuh wallet tetap bisa jadi Server Component.
 */

import {useState} from "react";
import {WagmiProvider} from "wagmi";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {wagmiConfig} from "@/lib/chain";
import {I18nProvider} from "@/lib/i18n";

export function Providers({children}: {children: React.ReactNode}) {
  // QueryClient dibuat di dalam state, bukan di ruang modul. Satu instans
  // modul dipakai bersama antar-permintaan di server, dan itu membocorkan
  // data satu pengguna ke pengguna lain.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            retry: 1,
            refetchOnWindowFocus: false
          }
        }
      })
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>{children}</I18nProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
