/**
 * Penyimpanan pilihan bahasa, sebagai sumber di LUAR React.
 *
 * KENAPA BUKAN `useState` + `useEffect`. Pola "baca localStorage di efek
 * lalu setState" memicu render berjenjang, dan React memperingatkannya
 * secara eksplisit. Yang lebih penting: localStorage memang bukan state
 * React — ia sistem eksternal yang bisa berubah dari TAB LAIN. Perkakas
 * yang benar untuk itu `useSyncExternalStore`, dan memakainya membuat
 * pilihan bahasa ikut tersinkron antar-tab secara gratis.
 */

export type Lang = "id" | "en";

const KUNCI = "jejak.lang";
const BAWAAN: Lang = "id";

const pendengar = new Set<() => void>();

/**
 * Snapshot WAJIB stabil: `useSyncExternalStore` membandingkannya dengan
 * `Object.is` setiap render, dan membaca localStorage setiap kali akan
 * mengembalikan string baru dan memicu render tanpa henti.
 */
let cache: Lang | null = null;

function bacaPenyimpanan(): Lang {
  try {
    const nilai = window.localStorage.getItem(KUNCI);
    return nilai === "id" || nilai === "en" ? nilai : BAWAAN;
  } catch {
    // Mode penyamaran atau penyimpanan diblokir.
    return BAWAAN;
  }
}

function beritahu() {
  for (const f of pendengar) f();
}

function onStorage(e: StorageEvent) {
  if (e.key !== null && e.key !== KUNCI) return;
  cache = null;
  beritahu();
}

export function subscribe(cb: () => void): () => void {
  if (pendengar.size === 0) window.addEventListener("storage", onStorage);
  pendengar.add(cb);

  return () => {
    pendengar.delete(cb);
    if (pendengar.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export function getSnapshot(): Lang {
  if (cache === null) cache = bacaPenyimpanan();
  return cache;
}

/** Server selalu merender bahasa bawaan, jadi hidrasi tidak pernah bentrok. */
export function getServerSnapshot(): Lang {
  return BAWAAN;
}

export function setLang(l: Lang) {
  cache = l;
  try {
    window.localStorage.setItem(KUNCI, l);
  } catch {
    // Pilihan tidak persisten, tapi sesi ini tetap benar.
  }
  beritahu();
}
