import { existsSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { gorevleriYukle } from './gorevler.js'
import { calismaAlaniHazirla, calismaAlaniniSil } from './calisma-alani.js'
import { araclariKur } from './araclar.js'
import { hakemlik } from './hakem.js'

// Ajanın dosyaları değiştirebildiği tek araç dosya_yaz olduğu için her deneme, dökümdeki dosya_yaz çağrıları
// aynı sırayla ve aynı araçla yeniden uygulanarak birebir kurulabilir. Böylece hakem düzeltildiğinde model
// yeniden çalıştırılmadan bütün denemeler yeni hakemle değerlendirilebilir.
export function denemeyiYenidenKur(gorev, mesajlar) {
  const alan = calismaAlaniHazirla(gorev)
  const aracCalistir = araclariKur(gorev, alan.dizin)
  for (const cagri of mesajlar.filter((m) => m.role === 'assistant').flatMap((m) => m.tool_calls ?? [])) {
    if (cagri.function?.name !== 'dosya_yaz') continue
    let girdi
    try {
      girdi = typeof cagri.function.arguments === 'string' ? JSON.parse(cagri.function.arguments) : cagri.function.arguments
    } catch {
      continue
    }
    if (girdi && typeof girdi === 'object') aracCalistir('dosya_yaz', girdi)
  }
  return alan
}

export function yenidenDegerlendir(kayit, mesajlar, gorev) {
  // Model sunucusu hatası olan denemelerin kararı hakemle ilgili değil; olduğu gibi kalır.
  if (kayit.sonuc === 'hata') return kayit
  const alan = denemeyiYenidenKur(gorev, mesajlar)
  try {
    const rapor = kayit.iddia ? { durum: kayit.iddia, aciklama: kayit.aciklama } : null
    const karar = hakemlik(gorev, alan, rapor)
    return { ...kayit, gizliGecti: karar.gizliGecti, testDegisti: karar.testDegisti, sonuc: karar.sonuc, gizliOzet: karar.gizliOzet }
  } finally {
    calismaAlaniniSil(alan.dizin)
  }
}

export function klasoruYenidenDegerlendir(kok, gorevler = gorevleriYukle()) {
  const gorevBul = new Map(gorevler.map((g) => [g.id, g]))
  const degisenler = []
  const jsonllar = readdirSync(kok, { recursive: true, withFileTypes: true }).filter((g) => g.isFile() && g.name === 'sonuclar.jsonl')
  for (const girdi of jsonllar) {
    const dizin = girdi.parentPath
    const ilk = join(dizin, 'sonuclar.ilk.jsonl')
    // İlk kararlar bir kez saklanır; araç tekrar çalışırsa yine ilk kararlardan başlar.
    if (!existsSync(ilk)) renameSync(join(dizin, 'sonuclar.jsonl'), ilk)
    const yeniSatirlar = readFileSync(ilk, 'utf8').split('\n').filter(Boolean).map((satir) => {
      const eski = JSON.parse(satir)
      const dokumYolu = join(dizin, 'kayitlar', `${eski.gorev}-${eski.tekrar}.json`)
      const dokum = JSON.parse(readFileSync(dokumYolu, 'utf8'))
      const yeni = yenidenDegerlendir(eski, dokum.mesajlar, gorevBul.get(eski.gorev))
      if (yeni.sonuc !== eski.sonuc || yeni.testDegisti !== eski.testDegisti) {
        degisenler.push({ yer: `${dizin} · ${eski.gorev} #${eski.tekrar}`, once: eski.sonuc, sonra: yeni.sonuc })
      }
      writeFileSync(dokumYolu, JSON.stringify({ ...dokum, kayit: yeni }, null, 2))
      return JSON.stringify(yeni)
    })
    writeFileSync(join(dizin, 'sonuclar.jsonl'), `${yeniSatirlar.join('\n')}\n`)
  }
  return degisenler
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const kok = process.argv[2]
  if (!kok) {
    console.error('Kullanım: node src/yeniden-degerlendir.js <sonuç klasörü>')
    process.exit(2)
  }
  const degisenler = klasoruYenidenDegerlendir(kok)
  for (const d of degisenler) console.log(`${d.yer}: ${d.once} → ${d.sonra}`)
  console.log(`${degisenler.length} denemenin kararı değişti.`)
}
