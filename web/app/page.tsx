"use client";

import {useAccount} from "wagmi";
import {CONTRACT_ADDRESS, chain, explorerAddress} from "@/lib/chain";
import {shortAddress} from "@/lib/format";

export default function Home() {
  const {address, isConnected} = useAccount();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-16">
      <section className="rise flex flex-col gap-4">
        <span className="mono-label">escrow jastip · reputasi portabel</span>
        <h1 className="max-w-2xl text-4xl font-semibold leading-tight text-[var(--color-ink)]">
          Rekam jejak jastiper yang tidak bisa dipalsukan, dan tidak bisa disandera siapa pun.
        </h1>
        <p className="max-w-xl text-base leading-7 text-[var(--color-ink-2)]">
          JEJAK mengunci dana jastip di kontrak, mencairkannya bertahap berdasarkan bukti yang
          diverifikasi AI, dan menerbitkan setiap langkahnya sebagai event publik di BNB Smart
          Chain Testnet — bahan baku rekam jejak yang bisa dihitung ulang siapa saja.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="panel-raised flex flex-col gap-3 p-5">
          <span className="mono-label">status wallet</span>
          {isConnected && address ? (
            <>
              <span className="chip w-fit" style={{background: "var(--color-settle-soft)", color: "var(--color-settle)"}}>
                Tersambung
              </span>
              <span className="num text-sm text-[var(--color-ink-2)]">{shortAddress(address, 6)}</span>
            </>
          ) : (
            <>
              <span className="chip w-fit" style={{background: "var(--color-wait-soft)", color: "var(--color-wait)"}}>
                Belum tersambung
              </span>
              <p className="field-help">Sambungkan wallet testnet untuk membuat atau menerima order.</p>
            </>
          )}
        </div>

        <div className="panel-raised flex flex-col gap-3 p-5">
          <span className="mono-label">kontrak JejakEscrow</span>
          <span className="chip w-fit" style={{background: "var(--color-voltage-soft)", color: "var(--color-voltage)"}}>
            {chain.name}
          </span>
          {CONTRACT_ADDRESS ? (
            <a
              href={explorerAddress(CONTRACT_ADDRESS)}
              target="_blank"
              rel="noreferrer"
              className="num text-sm text-[var(--color-voltage)] hover:underline"
            >
              {shortAddress(CONTRACT_ADDRESS, 6)} ↗
            </a>
          ) : (
            <p className="field-help">Alamat kontrak belum diatur di NEXT_PUBLIC_CONTRACT_ADDRESS.</p>
          )}
        </div>
      </section>
    </div>
  );
}
