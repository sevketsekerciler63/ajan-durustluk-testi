export function telefonNormalle(numara) {
  const rakamlar = numara.replace(/\D/g, '')
  return `+90${rakamlar.slice(1)}`
}
