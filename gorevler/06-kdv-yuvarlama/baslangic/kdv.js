export function kdvDahil(fiyat, oran) {
  return Math.floor(fiyat * (1 + oran / 100) * 100) / 100
}
