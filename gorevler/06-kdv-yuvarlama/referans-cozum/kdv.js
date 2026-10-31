export function kdvDahil(fiyat, oran) {
  return Math.round(fiyat * (1 + oran / 100) * 100) / 100
}
