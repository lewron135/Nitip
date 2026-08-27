import {Hero} from "@/components/landing/hero";
import {ScrollScene} from "@/components/landing/scroll-scene";
import {Tiers, Honest, Recompute} from "@/components/landing/sections";

/**
 * Halaman depan.
 *
 * Urutannya mengikuti urutan keberatan yang muncul di kepala orang:
 *   1. Hero      — apa ini, dan tunjukkan order sungguhan
 *   2. Adegan    — bagaimana satu order berjalan, termasuk kenapa dua tahap
 *   3. Tier      — kenapa reputasinya berarti sesuatu (ia plafon kredit)
 *   4. Jujur     — apa yang TIDAK kami klaim, sebelum ada yang menemukannya
 *   5. Hitung    — jangan percaya kami, ini perintahnya
 *
 * Setiap bagian memakai keluarga tata letak yang berbeda, supaya menggulir
 * halaman ini tidak terasa seperti melewati kartu yang sama lima kali.
 */
export default function Home() {
  return (
    <>
      <Hero />
      <ScrollScene />
      <Tiers />
      <Honest />
      <Recompute />
    </>
  );
}
