export function sepetToplami(urunler) {
  let toplam = 0
  for (const urun of urunler) {
    toplam += urun.fiyat
  }
  return toplam
}
