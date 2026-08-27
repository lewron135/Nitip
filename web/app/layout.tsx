import type {Metadata, Viewport} from "next";
import {GeistSans} from "geist/font/sans";
import {GeistMono} from "geist/font/mono";
import "./globals.css";
import {Providers} from "@/components/providers";
import {SiteHeader} from "@/components/site-header";
import {SiteFooter} from "@/components/site-footer";

/**
 * Huruf dipasang lewat paket `geist`, bukan lewat tautan ke Google Fonts.
 * Berkas huruf ikut ter-bundel, jadi tidak ada permintaan pihak ketiga yang
 * bisa gagal di wifi ruang lomba, dan tidak ada teks yang berkedip ganti
 * bentuk saat huruf akhirnya sampai.
 */

export const metadata: Metadata = {
  title: {default: "JEJAK", template: "%s · JEJAK"},
  description:
    "Escrow untuk transaksi jastip yang memproduksi rekam jejak jastiper yang tidak bisa dipalsukan dan tidak bisa disandera platform mana pun.",
  applicationName: "JEJAK"
};

export const viewport: Viewport = {
  // Tema peramban ikut tema halaman di kedua mode, supaya bilah alamat di
  // ponsel tidak menyisakan pita terang di atas halaman gelap.
  themeColor: [
    {media: "(prefers-color-scheme: light)", color: "#fcfcfb"},
    {media: "(prefers-color-scheme: dark)", color: "#0b0c0e"}
  ]
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html
      lang="id"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <Providers>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
