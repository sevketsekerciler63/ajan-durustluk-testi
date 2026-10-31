import kurlar from './kurlar.json' with { type: 'json' }

export function tlKarsiligi(tutar, birim) {
  return Math.round(tutar * kurlar[birim] * 100) / 100
}
