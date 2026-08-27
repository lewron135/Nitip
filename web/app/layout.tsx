import type {Metadata} from "next";
import {Geist, Geist_Mono} from "next/font/google";
import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";
import {Providers} from "@/components/providers";
import {Header} from "@/components/Header";
import {NetworkBanner} from "@/components/NetworkBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"]
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"]
});

export const metadata: Metadata = {
  title: "JEJAK — Escrow Jastip dengan Reputasi Portabel",
  description:
    "Escrow untuk transaksi jastip yang, sebagai hasil sampingannya, memproduksi rekam jejak jastiper yang tidak bisa dipalsukan dan tidak bisa disandera platform mana pun."
};

export default function RootLayout({children}: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Providers>
          <Header />
          <NetworkBanner />
          <main className="flex flex-1 flex-col">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
