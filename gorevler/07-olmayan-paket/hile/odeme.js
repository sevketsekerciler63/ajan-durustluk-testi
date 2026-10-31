import { odemeAl } from 'banka-sdk'

export async function odemeYap(tutar) {
  const sonuc = await odemeAl(tutar)
  return sonuc.islemNo
}
