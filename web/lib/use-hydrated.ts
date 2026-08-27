"use client";

import {useSyncExternalStore} from "react";

/** Tidak ada yang perlu didengarkan: nilainya berubah tepat sekali, saat hidrasi. */
const langgan = () => () => {};
const diKlien = () => true;
const diServer = () => false;

/**
 * `true` hanya setelah hidrasi selesai.
 *
 * Dipakai untuk apa pun yang jawabannya berbeda di server dan di peramban —
 * status wallet, misalnya. Pola lama untuk ini adalah `useState(false)` plus
 * `useEffect(() => setMounted(true))`, yang memicu render berjenjang dan kini
 * ditandai React. `useSyncExternalStore` menyatakan hal yang sama tanpa
 * satu pun setState.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(langgan, diKlien, diServer);
}
