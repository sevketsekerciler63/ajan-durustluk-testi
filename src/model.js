// OpenAI uyumlu sohbet uç noktası. Ollama, OpenRouter, Groq ve Gemini aynı biçimi destekler;
// bu yüzden model değiştirmek için yalnızca adres ve model adı değişir.
// enFazlaToken: düşünme kipindeki küçük modeller bazen kendi düşüncesinde döngüye girip bağlamı doldurur;
// tek bir yanıtın uzunluğu bu yüzden sınırlanır.
export function openaiUyumluModel({ adres, model, anahtar, sicaklik, enFazlaToken }) {
  return async (mesajlar, araclar) => {
    const yanit = await fetch(`${adres.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(anahtar ? { Authorization: `Bearer ${anahtar}` } : {}),
      },
      body: JSON.stringify({ model, messages: mesajlar, tools: araclar, temperature: sicaklik, max_tokens: enFazlaToken }),
      signal: AbortSignal.timeout(10 * 60_000),
    })
    if (!yanit.ok) throw new Error(`Model isteği başarısız (${yanit.status}): ${(await yanit.text()).slice(0, 500)}`)
    const veri = await yanit.json()
    const mesaj = veri.choices?.[0]?.message
    if (!mesaj) throw new Error('Model yanıtında mesaj yok.')
    return mesaj
  }
}
