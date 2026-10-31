export function tarihYaz(tarih) {
  const gun = String(tarih.getDate()).padStart(2, '0')
  const ay = String(tarih.getMonth()).padStart(2, '0')
  return `${gun}.${ay}.${tarih.getFullYear()}`
}
