import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { denetle, uyariMetni } from './dedektor.js'
import { claudeKaydindanOturum } from './okuyucular.js'

// Claude Code "Stop" kancası: Claude işini bitirip durmadan hemen önce çalışır.
// Claude Code kancaya standart girdiden JSON verir: transcript_path (oturum kaydı),
// last_assistant_message (Claude'un son yanıtı), stop_hook_active (bu duruş zaten bir kanca
// yüzünden mi devam ediyor?).
// Çıkış kodu 0: Claude durur. Çıkış kodu 2: Claude durmaz, standart hatadaki mesajı okuyup devam eder.
//
// Kural: Yalnızca son insan mesajından sonraki yazmalar denetlenir. Uyarı verilen değeri Claude
// son yanıtında hiç anmadıysa durması engellenir ve açıklama yapması istenir. Aynı tur içinde
// ikinci kez engellenmez (stop_hook_active), böylece kanca Claude'u döngüye sokmaz.
// Kancanın kendi hatası Claude'u asla durdurmaz: her hata 0 ile çıkar.

export function kancaKarari(girdi, kayitMetni) {
  if (girdi.stop_hook_active) return { kod: 0, uyarilar: [] }
  const oturum = claudeKaydindanOturum(kayitMetni)
  if (typeof girdi.last_assistant_message === 'string') oturum.sonMesaj = girdi.last_assistant_message
  const { uyarilar } = denetle(oturum, { kontrolBaslangici: oturum.sonInsanMesaji })
  const sessiz = uyarilar.filter((u) => !u.soylendi)
  if (!sessiz.length) return { kod: 0, uyarilar }
  const mesaj = [
    `Kaynaksız değer dedektörü: bu turda yazdığın dosyalarda kaynağı görünmeyen ${sessiz.length} şey var.`,
    '',
    ...sessiz.map(uyariMetni),
    '',
    'Bitirmeden önce kullanıcıya her biri için kısaca söyle: bu değeri nereden aldın? Bir yerden almadıysan',
    'bunu açıkça belirt ve kullanıcıdan gerçek değeri iste. Değer doğruysa kaynağını göster.',
  ].join('\n')
  return { kod: 2, mesaj, uyarilar }
}

function stdinOku() {
  try {
    return readFileSync(0, 'utf8')
  } catch {
    return ''
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  // Elle kullanım: node src/kanca.js --kayit <oturum.jsonl>  → bütün oturumu denetler, yalnızca listeler.
  const kayitIndeksi = process.argv.indexOf('--kayit')
  if (kayitIndeksi > 0) {
    const yol = process.argv[kayitIndeksi + 1]
    const { uyarilar } = denetle(claudeKaydindanOturum(readFileSync(yol, 'utf8')))
    console.log(uyarilar.length ? uyarilar.map(uyariMetni).join('\n\n') : 'Uyarı yok.')
    process.exit(0)
  }
  try {
    const girdi = JSON.parse(stdinOku() || '{}')
    if (!girdi.transcript_path) process.exit(0)
    const karar = kancaKarari(girdi, readFileSync(girdi.transcript_path, 'utf8'))
    if (karar.kod === 2) process.stderr.write(`${karar.mesaj}\n`)
    process.exit(karar.kod)
  } catch {
    process.exit(0)
  }
}
