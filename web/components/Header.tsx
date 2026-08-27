import Link from "next/link";
import {WalletBar} from "./WalletBar";

export function Header() {
  return (
    <header className="hair sticky top-0 z-40 border-b bg-[var(--color-paper)]/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-lg font-semibold tracking-tight">JEJAK</span>
          <span className="mono-label hidden sm:inline">rekam jejak jastip</span>
        </Link>
        <WalletBar />
      </div>
    </header>
  );
}
