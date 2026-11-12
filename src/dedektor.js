import { builtinModules } from 'node:module'

// Kaynaksız değer dedektörü.
// Soru: Ajanın dosyaya yazdığı her sayı, oturum boyunca gördüğü bir yerden (kullanıcının mesajı,
// okuduğu dosyalar, komut çıktıları) mi geliyor? Gelmiyorsa ajan onu uydurmuş olabilir.
// Yapay zekâ kullanmaz: yalnızca "bu sayı daha önce geçti mi?" diye bakar. Karar insanda kalır;
// dedektör "yanlış" demez, "kaynağı yok" der.
//
// Oturum biçimi (okuyucular bu biçimi üretir):
//   { olaylar: [{ tur: 'gorulen', metin } | { tur: 'yazilan', yol, metin }], sonMesaj }

// Kodda geçen sayılar: ondalıklılar (32.50) ve en az iki basamaklı tamsayılar (250).
// Tek basamaklılar alınmaz; neredeyse her yerde geçtikleri için bilgi taşımazlar.
// Bir kelimenin, sürüm numarasının (1.2.3) ya da renk kodunun (#ff0033) parçası olanlar alınmaz.
const KOD_SAYISI = /(?<![\w.$#]|\d-)(\d+\.\d+|\d{2,})(?![\w.])/g

// Görülen metinde Türkçe yazım da kabul edilir: "41,2873" ile "41.2873" aynı değerdir.
const METIN_SAYISI = /(?<![\w.$#])(\d+[.,]\d+|\d+)(?![\w])/g

// Herkesin bildiği, kaynak gerektirmeyen değerler.
const YAYGIN = new Set(['10', '100', '1000', '10000', '24', '60', '365', '1024', '3600'])

// Bu dosyalardaki sayılar denetlenmez: testler ve ajanın kendi deneme betikleri (reproduce.py)
// örnek değer taşır; belgeler kod değildir; derleme çıktıları ajanın yazdığı değil üretilen dosyalardır.
// Test dosyasıyla oynamayı yakalamak bu aracın işi değil (bkz. README).
const DENETLENMEYEN = /(^|[\\/])(tests?|__tests__|spec|\.eggs|build|dist|coverage|reports)[\\/]|\.egg-info[\\/]|[._-](test|spec)\.\w+$|(^|[\\/])(test_|reproduce)[^\\/]*$|\.(md|txt|rst|lock|svg|log|html)$/i

const BAGIMLILIK_KLASORU = /(?:^|[\\/])(node_modules|site-packages)[\\/]((?:@[^\\/]+[\\/])?[^\\/]+)/

// Görülen kodda içe aktarılan paket adları: import ... from 'banka-sdk', require('banka-sdk').
// Göreli yollar ('./x') ve Node'un kendi modülleri (fs, node:path) paket sayılmaz.
// Yalnızca JavaScript söz dizimi tanınır; düz metindeki "from 'dosya'" gibi ifadeler sayılmaz.
const ICE_AKTARMA = /\b(?:import|export)\s+(?:[\w*{}\s,$]+?\s+from\s*)?['"]([^'"\s]+)['"]|\b(?:require|import)\(\s*['"]([^'"\s]+)['"]\s*\)/g
const YERLESIK = new Set(builtinModules)

export function iceAktarilanPaketler(metin) {
  const paketler = new Set()
  for (const eslesme of String(metin).matchAll(ICE_AKTARMA)) {
    const ad = eslesme[1] ?? eslesme[2]
    if (ad.startsWith('.') || ad.startsWith('/') || ad.startsWith('node:')) continue
    const parcalar = ad.split('/')
    const paket = ad.startsWith('@') ? parcalar.slice(0, 2).join('/') : parcalar[0]
    if (!YERLESIK.has(paket)) paketler.add(paket)
  }
  return paketler
}

// Ajan, kodun içe aktardığı bir paketin adıyla proje içinde dosya ya da klasör yazdıysa
// (banka-sdk/index.js, banka-sdk.js) gerçek paketin yerine taklidini koymuş olabilir.
// Aynı adlı klasör daha önce görülmüşse (projenin kendi paketi) bu kural uygulanmaz; denetle() bakar.
function golgelenenPaket(yol, paketler) {
  const parcalar = String(yol).replace(/\\/g, '/').split('/')
  for (const paket of paketler) {
    const adim = paket.split('/').length
    for (let i = 0; i + adim <= parcalar.length; i++) {
      const aday = parcalar.slice(i, i + adim).join('/')
      const sonParca = i + adim === parcalar.length
      if (aday === paket || (sonParca && aday.replace(/\.[cm]?[jt]s$/, '') === paket)) return paket
    }
  }
  return null
}
// "32.50", "32.5" ve "032.5" aynı değerdir.
export function normalSayi(ham) {
  const sayi = Number(ham)
  return Number.isFinite(sayi) ? String(sayi) : ham
}

export function metindekiDegerler(metin) {
  const degerler = new Set()
  for (const [, ham] of String(metin).matchAll(METIN_SAYISI)) {
    if (!ham.includes(',')) {
      degerler.add(normalSayi(ham))
      continue
    }
    // "41,2873" hem ondalık (41.2873) hem de liste ("41, 2873") olabilir; ikisi de kaynak sayılır.
    degerler.add(normalSayi(ham.replace(',', '.')))
    for (const parca of ham.split(',')) degerler.add(normalSayi(parca))
  }
  return degerler
}

export function koddakiSayilar(metin) {
  const sonuc = []
  const satirlar = String(metin).split('\n')
  satirlar.forEach((satir, i) => {
    for (const [, ham] of satir.matchAll(KOD_SAYISI)) sonuc.push({ ham, deger: normalSayi(ham), satir: i + 1, satirMetni: satir.trim() })
  })
  return sonuc
}

export function denetlenirMi(yol) {
  return !DENETLENMEYEN.test(String(yol))
}

// Ajan uyarı verilen şeyden son mesajında bahsetti mi? Değerin kendisini ya da paketin adını
// anması gerekir; yalnızca dosya adını anmak ("kurlar.json oluşturuldu") yetmez, çünkü değerin
// uydurulduğunu söylemez. Bahsetmek de doğru açıklama demek değildir; yalnızca "sessizce
// geçmedi" demektir.
function soylendiMi(sonMesaj, ipuclari) {
  const mesaj = String(sonMesaj ?? '').toLowerCase()
  if (!mesaj) return false
  const mesajDegerleri = metindekiDegerler(mesaj)
  return ipuclari.some((ipucu) => (/^[\d.]+$/.test(ipucu) ? mesajDegerleri.has(ipucu) : mesaj.includes(ipucu.toLowerCase())))
}

// kontrolBaslangici: yalnızca bu sıradaki olaydan sonraki yazmalar denetlenir (ör. kancada son tur).
// Görülenler ise her zaman oturumun başından itibaren sayılır.
export function denetle(oturum, { kontrolBaslangici = 0 } = {}) {
  const gorulen = new Set()
  const gorulenMetinler = []
  const paketler = new Set()
  const uyarilar = []
  const anahtarlar = new Set()
  let denetlenenYazma = 0

  const paketUyarisi = (yol, paket, klasor) => {
    if (anahtarlar.has(`paket:${paket}`)) return
    anahtarlar.add(`paket:${paket}`)
    uyarilar.push({ tur: 'sahte-bagimlilik', yol, paket, klasor })
  }

  oturum.olaylar.forEach((olay, sira) => {
    if (olay.tur === 'gorulen') {
      for (const deger of metindekiDegerler(olay.metin)) gorulen.add(deger)
      for (const paket of iceAktarilanPaketler(olay.metin)) paketler.add(paket)
      gorulenMetinler.push(String(olay.metin).replace(/\\/g, '/'))
      return
    }
    if (olay.tur !== 'yazilan' || sira < kontrolBaslangici) {
      // Denetlenmeyen eski yazmalar da sonraki yazmalar için kaynak sayılmaz; yalnızca atlanır.
      return
    }

    const klasordeki = olay.yol.match(BAGIMLILIK_KLASORU)
    if (klasordeki) return paketUyarisi(olay.yol, klasordeki[2].replace(/\\/g, '/'), klasordeki[1])
    const golgelenen = golgelenenPaket(olay.yol, paketler)
    if (golgelenen && !gorulenMetinler.some((m) => m.includes(`${golgelenen}/`))) return paketUyarisi(olay.yol, golgelenen, 'proje içinde')
    if (!denetlenirMi(olay.yol)) return
    denetlenenYazma++
    for (const sayi of koddakiSayilar(olay.metin)) {
      if (YAYGIN.has(sayi.deger) || gorulen.has(sayi.deger)) continue
      const anahtar = `deger:${olay.yol}:${sayi.deger}`
      if (anahtarlar.has(anahtar)) continue
      anahtarlar.add(anahtar)
      uyarilar.push({ tur: 'kaynaksiz-deger', yol: olay.yol, deger: sayi.ham, satirMetni: sayi.satirMetni })
    }
  })

  for (const uyari of uyarilar) {
    const ipuclari = uyari.tur === 'sahte-bagimlilik' ? [uyari.paket] : [normalSayi(uyari.deger)]
    uyari.soylendi = soylendiMi(oturum.sonMesaj, ipuclari)
  }
  return { uyarilar, denetlenenYazma }
}

export function uyariMetni(uyari) {
  const sessiz = uyari.soylendi ? '' : ' Ajan son mesajında bundan söz etmedi.'
  if (uyari.tur === 'sahte-bagimlilik') {
    const nerede = uyari.klasor === 'proje içinde' ? 'adıyla proje içinde elle dosya yazıldı' : `klasörüne (${uyari.klasor}) elle dosya yazıldı`
    return `⚠ Sahte bağımlılık: ${uyari.yol}\n  "${uyari.paket}" paketinin ${nerede}. Testler gerçek paketle değil bu taklitle geçiyor olabilir.${sessiz}`
  }
  return `⚠ Kaynaksız değer: ${uyari.yol}\n  ${uyari.deger}  →  ${uyari.satirMetni.slice(0, 120)}\n  Bu sayı oturumda okunan hiçbir dosyada, komut çıktısında ya da kullanıcının mesajında geçmiyor.${sessiz}`
}
