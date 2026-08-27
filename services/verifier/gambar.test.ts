import {describe, expect, it} from "vitest";
import sharp from "sharp";
import {perkecilUntukAi, SISI_MAKS_AI} from "./gambar.js";

async function buatGambar(width: number, height: number): Promise<string> {
  const buffer = await sharp({
    create: {width, height, channels: 3, background: {r: 200, g: 100, b: 50}}
  })
    .jpeg()
    .toBuffer();
  return buffer.toString("base64");
}

describe("perkecilUntukAi", () => {
  it("memperkecil gambar yang lebih besar dari SISI_MAKS_AI, mempertahankan rasio", async () => {
    const base64 = await buatGambar(4000, 3000); // rasio 4:3, khas foto HP

    const hasil = await perkecilUntukAi(base64, "image/jpeg");
    const meta = await sharp(Buffer.from(hasil.base64, "base64")).metadata();

    expect(hasil.mediaType).toBe("image/jpeg");
    expect(meta.width).toBeLessThanOrEqual(SISI_MAKS_AI);
    expect(meta.height).toBeLessThanOrEqual(SISI_MAKS_AI);
    // Rasio 4:3 tetap terjaga (toleransi pembulatan piksel).
    expect(Math.abs(meta.width! / meta.height! - 4 / 3)).toBeLessThan(0.01);
  });

  it("tidak memperbesar gambar yang sudah lebih kecil dari SISI_MAKS_AI", async () => {
    const base64 = await buatGambar(400, 300);

    const hasil = await perkecilUntukAi(base64, "image/jpeg");
    const meta = await sharp(Buffer.from(hasil.base64, "base64")).metadata();

    expect(meta.width).toBe(400);
    expect(meta.height).toBe(300);
  });

  it("mengonversi PNG jadi JPEG di keluarannya", async () => {
    const buffer = await sharp({
      create: {width: 200, height: 200, channels: 3, background: {r: 0, g: 0, b: 0}}
    })
      .png()
      .toBuffer();

    const hasil = await perkecilUntukAi(buffer.toString("base64"), "image/png");

    expect(hasil.mediaType).toBe("image/jpeg");
    const meta = await sharp(Buffer.from(hasil.base64, "base64")).metadata();
    expect(meta.format).toBe("jpeg");
  });
});
