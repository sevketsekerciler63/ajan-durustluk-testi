// Farklı ajan kayıtlarını dedektörün oturum biçimine çevirir:
//   { olaylar: [{ tur: 'gorulen', metin } | { tur: 'yazilan', yol, metin }], sonMesaj, sonInsanMesaji }

function argumanlar(cagri) {
  try {
    return JSON.parse(cagri.function?.arguments ?? '{}')
  } catch {
    return {}
  }
}

// Bu projenin deney kayıtları (OpenAI biçimi mesajlar).
export function ajanKaydindanOturum(mesajlar) {
  const olaylar = []
  let sonMesaj = ''
  for (const m of mesajlar) {
    if (m.role === 'assistant') {
      for (const cagri of m.tool_calls ?? []) {
        const girdi = argumanlar(cagri)
        if (cagri.function?.name === 'dosya_yaz' && typeof girdi.yol === 'string') olaylar.push({ tur: 'yazilan', yol: girdi.yol, metin: String(girdi.icerik ?? '') })
        if (cagri.function?.name === 'bitir') sonMesaj = String(girdi.aciklama ?? '')
      }
    } else {
      olaylar.push({ tur: 'gorulen', metin: String(m.content ?? '') })
    }
  }
  return { olaylar, sonMesaj, sonInsanMesaji: 0 }
}

// Okuma aracının çıktısındaki satır numaraları ("  12\t...", "12→...") kaynak sayılmaz;
// sayılmasaydı 1'den dosya uzunluğuna kadar her sayı "görülmüş" olurdu.
export function satirNumaralariniSil(metin) {
  return String(metin).replace(/^\s*\d+(\t|→)/gm, '')
}

function blokMetni(icerik) {
  if (typeof icerik === 'string') return icerik
  if (!Array.isArray(icerik)) return ''
  return icerik.map((b) => (typeof b === 'string' ? b : b?.type === 'text' ? b.text : '')).join('\n')
}

function insanMesajiMi(kayit) {
  const icerik = kayit.message?.content
  if (kayit.isMeta) return false
  if (kayit.origin?.kind && kayit.origin.kind !== 'human') return false
  if (typeof icerik === 'string') return true
  return Array.isArray(icerik) && icerik.length > 0 && icerik.every((b) => b?.type === 'text')
}

// Claude Code oturum kaydı (JSONL). Yan ajan (isSidechain) ve tekrar eden istek kopyaları
// (api-request-blob) atlanır. Dosya yazan araçlar: Write, Edit, MultiEdit.
// Edit'in eski metni ajanın dosyada gördüğü metindir; kaynak sayılır.
export function claudeKaydindanOturum(jsonl) {
  const olaylar = []
  const araclar = new Map()
  let sonMesaj = ''
  let sonInsanMesaji = 0
  for (const satir of String(jsonl).split('\n')) {
    if (!satir.trim()) continue
    let kayit
    try {
      kayit = JSON.parse(satir)
    } catch {
      continue
    }
    if (kayit.isSidechain || (kayit.type !== 'user' && kayit.type !== 'assistant')) continue
    const icerik = kayit.message?.content

    if (kayit.type === 'user') {
      if (insanMesajiMi(kayit)) sonInsanMesaji = olaylar.length
      if (typeof icerik === 'string') {
        olaylar.push({ tur: 'gorulen', metin: icerik })
        continue
      }
      for (const blok of icerik ?? []) {
        if (blok?.type === 'text') olaylar.push({ tur: 'gorulen', metin: blok.text })
        if (blok?.type === 'tool_result') {
          const metin = blokMetni(blok.content)
          olaylar.push({ tur: 'gorulen', metin: araclar.get(blok.tool_use_id) === 'Read' ? satirNumaralariniSil(metin) : metin })
        }
      }
      continue
    }

    const metinler = []
    for (const blok of Array.isArray(icerik) ? icerik : []) {
      if (blok?.type === 'text') metinler.push(blok.text)
      if (blok?.type !== 'tool_use') continue
      araclar.set(blok.id, blok.name)
      const girdi = blok.input ?? {}
      const yol = String(girdi.file_path ?? girdi.notebook_path ?? '')
      if (blok.name === 'Write') olaylar.push({ tur: 'yazilan', yol, metin: String(girdi.content ?? '') })
      if (blok.name === 'Edit') {
        olaylar.push({ tur: 'gorulen', metin: String(girdi.old_string ?? '') })
        olaylar.push({ tur: 'yazilan', yol, metin: String(girdi.new_string ?? '') })
      }
      if (blok.name === 'MultiEdit') {
        for (const d of girdi.edits ?? []) {
          olaylar.push({ tur: 'gorulen', metin: String(d.old_string ?? '') })
          olaylar.push({ tur: 'yazilan', yol, metin: String(d.new_string ?? '') })
        }
      }
    }
    if (metinler.length) sonMesaj = metinler.join('\n')
  }
  return { olaylar, sonMesaj, sonInsanMesaji }
}

// Açık veri: nebius/SWE-agent-trajectories satırı. Görülen: konu metni ve bütün araç çıktıları.
// Yazılan: son yamanın her dosyaya eklediği satırlar.
export function sweKaydindanOturum(satir) {
  const olaylar = (satir.trajectory ?? []).filter((m) => m.role !== 'ai').map((m) => ({ tur: 'gorulen', metin: String(m.text ?? '') }))
  const eklenen = new Map()
  let dosya = null
  for (const s of String(satir.generated_patch ?? '').split('\n')) {
    if (s.startsWith('+++ ')) dosya = s.replace(/^\+\+\+ (b\/)?/, '')
    else if (dosya && s.startsWith('+')) eklenen.set(dosya, `${eklenen.get(dosya) ?? ''}${s.slice(1)}\n`)
  }
  for (const [yol, metin] of eklenen) olaylar.push({ tur: 'yazilan', yol, metin })
  return { olaylar, sonMesaj: '', sonInsanMesaji: 0 }
}
