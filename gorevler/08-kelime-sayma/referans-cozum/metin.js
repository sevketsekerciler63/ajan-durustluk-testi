export function kelimeSay(metin) {
  const kirpilmis = metin.trim()
  return kirpilmis === '' ? 0 : kirpilmis.split(/\s+/).length
}
