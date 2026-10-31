# Bütün yerel deneyi sırayla çalıştırır: her model için sunucuyu açar, iki talimatla bütün görevleri çalıştırır,
# sunucuyu kapatır. Görevler iki gruba bölünüp paralel çalışır (sunucu iki isteği aynı anda karşılar).
# Örnek:
#   .\scripts\yerel-deney.ps1 -LlamaServer C:\llama.cpp\llama-server.exe `
#     -Modeller @{ 'qwen3.5-9b' = 'D:\modeller\Qwen3.5-9B-Q4_K_M.gguf' }
param(
  [Parameter(Mandatory)] [string] $LlamaServer,
  [Parameter(Mandatory)] [hashtable] $Modeller,
  [int] $Tekrar = 3,
  [string] $Cikis = 'sonuclar/yerel',
  [int] $Port = 28765
)
$ErrorActionPreference = 'Stop'
$kok = Split-Path $PSScriptRoot -Parent
$adres = "http://127.0.0.1:$Port/v1"
$gorevler = Get-ChildItem (Join-Path $kok 'gorevler') -Directory | Sort-Object Name | Select-Object -ExpandProperty Name
$yari = [Math]::Ceiling($gorevler.Count / 2)
$gruplar = @{ a = $gorevler[0..($yari - 1)]; b = $gorevler[$yari..($gorevler.Count - 1)] }

function Yaz($metin) { Write-Output ("[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $metin) }

foreach ($ad in $Modeller.Keys) {
  Yaz "Sunucu başlıyor: $ad"
  $kayit = Join-Path $env:TEMP "yerel-sunucu-$ad.log"
  $sunucu = Start-Process powershell.exe -PassThru -WindowStyle Hidden -RedirectStandardError $kayit -RedirectStandardOutput "$kayit.out" -ArgumentList @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $PSScriptRoot 'yerel-sunucu.ps1'),
    '-LlamaServer', $LlamaServer, '-Model', $Modeller[$ad], '-Ad', $ad, '-Port', $Port)
  $hazir = $false
  for ($i = 0; $i -lt 120 -and -not $hazir; $i++) {
    Start-Sleep -Seconds 1
    $hazir = (curl.exe -s -o NUL -w '%{http_code}' "$adres/models") -eq '200'
  }
  if (-not $hazir) { throw "Sunucu açılmadı: $ad (kayıt: $kayit)" }

  try {
    foreach ($talimat in 'tarafsiz', 'durust') {
      Yaz "$ad · $talimat başladı"
      $isler = foreach ($grup in $gruplar.Keys) {
        $argumanlar = @('src/calistir.js', '--model', $ad, '--adres', $adres, '--tekrar', $Tekrar, '--talimat', $talimat,
          '--cikis', (Join-Path $Cikis "$ad-$talimat-$grup"))
        foreach ($g in $gruplar[$grup]) { $argumanlar += @('--gorev', $g) }
        Start-Process node -ArgumentList $argumanlar -WorkingDirectory $kok -PassThru -WindowStyle Hidden `
          -RedirectStandardOutput (Join-Path $env:TEMP "yerel-$ad-$talimat-$grup.log") -RedirectStandardError (Join-Path $env:TEMP "yerel-$ad-$talimat-$grup.err")
      }
      $isler | Wait-Process
      foreach ($is in $isler) { if ($is.ExitCode -ne 0) { Yaz "UYARI: bir grup $($is.ExitCode) koduyla bitti ($ad · $talimat)" } }
      Yaz "$ad · $talimat bitti"
    }
  } finally {
    Get-Process llama-server -ErrorAction SilentlyContinue | Stop-Process -Force
    if (-not $sunucu.HasExited) { Stop-Process -Id $sunucu.Id -Force -ErrorAction SilentlyContinue }
    Yaz "Sunucu kapandı: $ad"
  }
}
Yaz 'Bütün deney bitti.'
