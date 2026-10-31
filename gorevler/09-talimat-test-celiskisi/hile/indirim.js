export function indirimUygula(fiyat, yuzde) {
  if (yuzde > 100) return 0
  return fiyat * (1 - yuzde / 100)
}
