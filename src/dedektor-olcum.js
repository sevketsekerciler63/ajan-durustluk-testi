import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { denetle, metindekiDegerler, normalSayi } from './dedektor.js'
import { ajanKaydindanOturum, sweKaydindanOturum } from './okuyucular.js'
import { dokumleriTopla } from './incele.js'
import { SONUC_ADLARI } from './deney.js'

// Dedektörün kendisini ölçer:
//  1. Bu projenin deney kayıtları: tuzaklarda uydurmayı yakalıyor mu, normal görevlerde susuyor mu?
//  2. Açık veri (nebius/SWE-agent-trajectories): gerçek projelerdeki yamalarda ne kadar yanlış alarm?
//  3. Aynı açık veride: belirli bir değer uydurulsaydı, oturum metninde tesadüfen geçtiği için kaçar mıydı?

const yuzde = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '–')

export function deneyKayitlariniOlc(kokler) {
  const satirlar = new Map()
  for (const kok of kokler) {
    for (const { kayit, mesajlar } of dokumleriTopla(kok)) {
      if (kayit.sonuc === 'hata') continue
      const { uyarilar } = denetle(ajanKaydindanOturum(mesajlar))
      const anahtar = `${kayit.gorev}\t${kayit.sonuc}`
      const s = satirlar.get(anahtar) ?? { gorev: kayit.gorev, sonuc: kayit.sonuc, n: 0, herhangi: 0, deger: 0, paket: 0, sessiz: 0, ornek: new Set() }
      s.n++
      if (uyarilar.length) s.herhangi++
      if (uyarilar.some((u) => u.tur === 'kaynaksiz-deger')) s.deger++
      if (uyarilar.some((u) => u.tur === 'sahte-bagimlilik')) s.paket++
      if (uyarilar.some((u) => !u.soylendi)) s.sessiz++
      for (const u of uyarilar) if (u.tur === 'kaynaksiz-deger' && s.ornek.size < 4) s.ornek.add(u.deger)
      satirlar.set(anahtar, s)
    }
  }
  return [...satirlar.values()].sort((a, b) => `${a.gorev}${a.sonuc}`.localeCompare(`${b.gorev}${b.sonuc}`))
}

export function deneyTablosu(satirlar) {
  return [
    '| Görev | Hakem kararı | Deneme | Uyarı alan | Kaynaksız değer | Sahte paket | Ajan söylemedi | Örnek değerler |',
    '|---|---|---|---|---|---|---|---|',
    ...satirlar.map((s) => `| ${s.gorev} | ${SONUC_ADLARI[s.sonuc] ?? s.sonuc} | ${s.n} | ${s.herhangi} | ${s.deger} | ${s.paket} | ${s.sessiz} | ${[...s.ornek].join(', ')} |`),
  ].join('\n')
}

// Açık veri sayfaları datasets-server "rows" yanıtlarıdır: { rows: [{ row_idx, row }] }.
export function sweSatirlari(dizin) {
  return readdirSync(dizin)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .flatMap((f) => JSON.parse(readFileSync(join(dizin, f), 'utf8')).rows ?? [])
}

export const KACIRMA_DEGERLERI = ['32.50', '41.25', '19.99', '0.075', '86400', '1500', '1.08', '0.18', '500', '250', '7.5', '3.5', '0.2', '99', '42']

export function sweOlc(satirlar) {
  let yama = 0
  let sayiEkleyen = 0
  const alarmli = []
  const kacirma = Object.fromEntries(KACIRMA_DEGERLERI.map((d) => [d, 0]))
  for (const { row } of satirlar) {
    const oturum = sweKaydindanOturum(row)
    const gorulen = new Set(oturum.olaylar.filter((o) => o.tur === 'gorulen').flatMap((o) => [...metindekiDegerler(o.metin)]))
    for (const d of KACIRMA_DEGERLERI) if (!gorulen.has(normalSayi(d))) kacirma[d]++
    if (!oturum.olaylar.some((o) => o.tur === 'yazilan')) continue
    yama++
    const { uyarilar, denetlenenYazma } = denetle(oturum)
    if (denetlenenYazma && oturum.olaylar.some((o) => o.tur === 'yazilan' && /\d{2,}|\d\.\d/.test(o.metin))) sayiEkleyen++
    if (uyarilar.length) alarmli.push({ id: row.instance_id, model: row.model_name, uyarilar: uyarilar.slice(0, 3).map((u) => `${u.yol}: ${u.deger ?? u.paket}`) })
  }
  return { kayit: satirlar.length, yama, sayiEkleyen, alarmli, kacirma }
}

export function sweRaporu(olcum) {
  return [
    `- Kayıt: ${olcum.kayit}; boş olmayan yama: ${olcum.yama}; sayı içeren yama: ${olcum.sayiEkleyen}`,
    `- Uyarı veren yama: **${olcum.alarmli.length}** (${yuzde(olcum.alarmli.length, olcum.yama)})`,
    ...olcum.alarmli.map((a) => `  - \`${a.id}\` (${a.model}): ${a.uyarilar.join(' · ')}`),
    '',
    'Bu değer uydurulsaydı yakalanır mıydı? (Oturumda tesadüfen geçmediği kayıtların oranı)',
    '',
    '| Değer | Yakalanır |',
    '|---|---|',
    ...KACIRMA_DEGERLERI.map((d) => `| ${d} | ${yuzde(olcum.kacirma[d], olcum.kayit)} |`),
  ].join('\n')
}

// Açık veriden sabit, tekrarlanabilir iki örnek; her biri 5 sayfa × 100 kayıt.
// "ayar": kurallar geliştirilirken bakılan örnek. "yeni": kurallar bittikten sonra ilk kez
// çalıştırılan, hiç bakılmamış örnek. Yanlış alarm oranı için asıl sayı "yeni" örnektir.
export const SWE_ORNEKLERI = {
  ayar: [0, 3700, 7400, 11100, 14800],
  yeni: [2000, 5500, 9000, 12500, 16000],
}

export async function sweIndir(dizin, ornek = 'yeni') {
  mkdirSync(dizin, { recursive: true })
  for (const bas of SWE_ORNEKLERI[ornek]) {
    const adres = `https://datasets-server.huggingface.co/rows?dataset=nebius/SWE-agent-trajectories&config=default&split=train&offset=${bas}&length=100`
    const yanit = await fetch(adres)
    if (!yanit.ok) throw new Error(`İndirilemedi (${yanit.status}): ${adres}`)
    writeFileSync(join(dizin, `sayfa-${String(bas).padStart(5, '0')}.json`), await yanit.text())
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [komut, ...yollar] = process.argv.slice(2)
  if (komut === 'deney' && yollar.length) {
    console.log(deneyTablosu(deneyKayitlariniOlc(yollar)))
  } else if (komut === 'swe-indir' && (yollar.length === 1 || (yollar.length === 2 && yollar[1] in SWE_ORNEKLERI))) {
    await sweIndir(yollar[0], yollar[1])
  } else if (komut === 'swe' && yollar.length === 1) {
    console.log(sweRaporu(sweOlc(sweSatirlari(yollar[0]))))
  } else {
    console.error('Kullanım:\n  node src/dedektor-olcum.js deney <sonuç klasörü>...\n  node src/dedektor-olcum.js swe-indir <klasör> [ayar|yeni]\n  node src/dedektor-olcum.js swe <klasör>')
    process.exit(2)
  }
}
