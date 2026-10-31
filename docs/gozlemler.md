# Yapay zekânın yazdığı kodda yakalanan hatalar

Projelerimin çoğunu yapay zekâ asistanlarıyla yazdım. Bu belge, bunun riskinin somut hâli: derlenen, analizden geçen ve ekranda çalışıyor görünen kodda gerçekten yeniden üretilen hatalar. Her kayıtta dört şey var: ne oldu, nasıl görüldü, neden "yeşil" görünüyordu ve düzeltmeyi hangi test koruyor.

Kayıtların hepsi iki public depodaki commit ve test dosyalarına bağlı: [sinav-rotasi](https://github.com/sevketsekerciler63/sinav-rotasi) ve [turkce-llm-degerlendirme](https://github.com/sevketsekerciler63/turkce-llm-degerlendirme). Burada yazan hiçbir şeyi bu depolardan bağımsız bir iddia olarak okumayın; commit'i açıp bakın.

## Başlangıç durumu

16 Ekim 2026'da Sınav Rotası'nın durumu şuydu: `flutter analyze` temizdi, uygulama derleniyordu, ekranlar çalışıyordu. `test/widget_test.dart` ise yalnızca `void main() {}` içeriyordu ve CI yoktu.

O gün yapılan [denetim](https://github.com/sevketsekerciler63/sinav-rotasi/blob/master/docs/research-audit-2026-10-16.md) 16 bulgu çıkardı. Denetimin kendi tespiti: analiz ve derleme, bulgulardan beşini (AUD-01, 02, 03, 07, 08) yakalamadı. Hepsi çalışan koda ait hatalardı, derleyicinin göremeyeceği türden.

## Kayıtlar

### 1. Kaydedilmemiş ayar, "güncellendi" diyordu (AUD-02)

- **Ne oldu:** Depoda günlük çalışma süresi 180 dakika iken sonraki yazım yapay olarak başarısız bırakıldı. Yöntem normal döndü; bellekte 30, diskte 180 dakika vardı. Ayarlar ekranı, yöntem normal döndüğü için yeşil "güncellendi" mesajını gösterecek durumdaydı.
- **Neden görünmedi:** Yazım katmanı hatayı yakalayıp yutuyordu, çağırana başarısızlık iletmiyordu. Mutlu yolda her şey çalışıyordu.
- **Düzeltme:** Yazım hatası çağırana ulaşıyor, bellek eski kalıcı değerde kalıyor, ilgisiz başarılı bir kayıt önceki hatayı "kaydedildi" saymıyor.
- **Test:** [`storage_recovery_test.dart:96`](https://github.com/sevketsekerciler63/sinav-rotasi/blob/master/test/storage_recovery_test.dart#L96), commit [`bfd7b11`](https://github.com/sevketsekerciler63/sinav-rotasi/commit/bfd7b11).

### 2. İki eşzamanlı kayıttan biri kayboluyordu (AUD-03)

- **Ne oldu:** İki farklı odak oturumu aynı anda kaydedildi. İki çağrı da `true` döndü, kalıcı listede tek kayıt kaldı.
- **Neden görünmedi:** Kayıt listesi, yazma kuyruğuna girmeden önce kopyalanıyordu. Kuyruk yazmaları sıraya koyuyordu ama ikinci yazmanın eski listeyle birinciyi ezmesini engellemiyordu.
- **Sınır:** Denetim bunun yalnızca eşzamanlı çağrı koşulunda geçerli olduğunu, her oturumun kaybolduğu anlamına gelmediğini ve gerçek bir kullanıcı verisinin kaybolduğunun iddia edilmediğini açıkça yazıyor.
- **Düzeltme:** Oku, kimlik kontrol et, ekle, yaz işlemi tek profil kuyruğunda. Aynı kimlikle yeniden deneme tek kayıt bırakıyor; aynı kimlik, farklı içerik reddediliyor.
- **Test:** [`storage_recovery_test.dart:77`](https://github.com/sevketsekerciler63/sinav-rotasi/blob/master/test/storage_recovery_test.dart#L77).

### 3. Uygulama kendi yedeğini bozuyordu (AUD-01)

- **Ne oldu:** `{'TYT Türkçe': 100, 'TYT Turkce': 0}` net girişi kabul edildi ve resmî toplam 100 oldu, oysa sınır 40. Aynı uygulamanın ürettiği yedek, bu veriyi geçersiz diye reddetti.
- **Neden görünmedi:** Doğrulayan kod aynı normalize anahtarı son değerle eziyordu, okuyan kod ise kanonik anahtarı seçiyordu. Doğrulanan değerle kullanılan değer farklıydı.
- **Düzeltme:** Tek kanonikleştirme sözleşmesi; aynı derse gelen çelişen anahtarlar yazılmadan reddediliyor.
- **Test:** [`storage_recovery_test.dart:130`](https://github.com/sevketsekerciler63/sinav-rotasi/blob/master/test/storage_recovery_test.dart#L130).

### 4. Geri al, yeniden yap: tekrar aralığı kendiliğinden büyüyordu (AUD-08)

- **Ne oldu:** Aynı tekrar görevinde tamamla, geri al, tamamla dizisi tekrar aralığını 1 günden 3 güne çıkardı. Yeni bir öğrenme olayı yokken tekrar sayısı artıyordu.
- **Neden görünmedi:** Plan kaynaklı çağrı, tekrar ekranındaki vade kontrolünü atlıyordu ve olayların kimliği yoktu.
- **Düzeltme:** Tekrar olayları kalıcı kimlikle saklanıyor, aynı olay ikinci kez sayılmıyor; eski bir olayı geri almak sonradan yapılanları silmiyor.
- **Test:** [`review_history_test.dart:19`](https://github.com/sevketsekerciler63/sinav-rotasi/blob/master/test/review_history_test.dart#L19), commit [`6df0300`](https://github.com/sevketsekerciler63/sinav-rotasi/commit/6df0300).

### 5. Ekrandan çıkmak çalışma seansını iptal sayıyordu

- **Ne oldu:** Pomodoro ekranından çıkmak, seansı "iptal edilmiş" olarak sayıyordu.
- **Nasıl bulundu:** Denetim listesinde yoktu. Ekran kabul testleri yazılırken ortaya çıktı.
- **Düzeltme:** Süre, görev ve olay kimliği korunuyor; süresi dolan seans ekrana dönülünce kaydediliyor; yazım hatasında aynı kayıt aynı içerikle yeniden deneniyor.
- **Test:** [`motion_timer_acceptance_test.dart`](https://github.com/sevketsekerciler63/sinav-rotasi/blob/master/test/motion_timer_acceptance_test.dart), commit [`87ecee5`](https://github.com/sevketsekerciler63/sinav-rotasi/commit/87ecee5).

### 6. Yanlış gün adı, testle yakalandı (turkce-llm-degerlendirme)

- **Ne oldu:** Bir görev metnindeki "14 Kasım 2026" tarihinin yanındaki gün adı yanlış "düzeltilmişti" (Perşembe). 14 Kasım 2026 aslında Cumartesi.
- **Nasıl bulundu:** Görev setinin testi, metindeki gün adını gerçek takvimle karşılaştırıyor.
- **Neden önemli:** Bir değerlendirme aracında yanlış soru, modeli yanlış puanlamak demek. Bu hata modele sorulmadan önce yakalandı.
- **Test:** [`dataset.test.ts:63`](https://github.com/sevketsekerciler63/turkce-llm-degerlendirme/blob/main/test/dataset.test.ts#L63), commit [`4ed4a72`](https://github.com/sevketsekerciler63/turkce-llm-degerlendirme/commit/4ed4a72).

## Ortak desen

- **Hatalar mutlu yolda değil, hata yolunda, geri almada ve eşzamanlılıkta.** Derleme ve statik analiz bunlara bakmaz. Ekranda tek tek denenince de çalışıyor görünürler.
- **Boş test dosyası kanıt değildir.** "Derleniyor, analiz temiz" yeşil görünür ama bu kayıtlardaki hiçbir hatayı yakalamamıştı.
- **Önce hatayı yeniden üretiyorum.** Denetimdeki bulgular, gerçek kullanıcı deposuna dokunmayan izole bir sınama ile yeniden üretildi ([çıktı özeti](https://github.com/sevketsekerciler63/sinav-rotasi/blob/master/docs/audit-observations-2026-10-16.json)). Yeniden üretilemeyen iddia "doğrulandı" sayılmadı. Kabul ölçütü de buydu: hatalı davranışa karşı test kırılmalı, düzeltmeden sonra geçmeli.
- **Test, kodun yaptığı hesabı tekrar etmemeli.** Türkçe LLM Değerlendirme'de sayısal görevlerin beklenen değerleri, görevden bağımsız yeniden hesaplanıyor; gün adı gerçek takvimle karşılaştırılıyor.

## Sınırlar

- Bu liste seçilmiş kayıtlardır, bütün hataların listesi değildir. Denetimin 16 bulgusundan dördü burada.
- Kod ve denetim turları yapay zekâ ajanlarıyla yürütüldü. Bulgular insan bir yazılımcının incelemesinden çıkmadı.
- Fiziksel telefon, ekran okuyucu ve farklı cihazdan yedek kurtarma kabulü yapılmadı; ilgili proje belgeleri bunu açık madde olarak tutuyor.
- Gerçek kullanıcı verisinin kaybolduğu iddia edilmiyor. Bunlar yeniden üretilen, düzeltilen ve testle korunan hatalar.
