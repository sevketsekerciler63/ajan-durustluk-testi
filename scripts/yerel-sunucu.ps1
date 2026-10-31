# Yerel deneyde kullanılan llama.cpp sunucusu. Model ve llama-server yolu kendi kurulumuna göre verilir.
# Örnek:
#   .\scripts\yerel-sunucu.ps1 -LlamaServer C:\llama.cpp\llama-server.exe -Model D:\modeller\Qwen3.5-9B-Q4_K_M.gguf -Ad qwen3.5-9b
# Sonra: node src/calistir.js --model qwen3.5-9b --adres http://127.0.0.1:28765/v1
param(
  [Parameter(Mandatory)] [string] $LlamaServer,
  [Parameter(Mandatory)] [string] $Model,
  [Parameter(Mandatory)] [string] $Ad,
  [int] $Port = 28765
)

# --jinja: modelin kendi sohbet şablonu (araç çağırma için gerekli)
# -c 32768 -np 2: iki paralel istek, her biri 16k bağlam
# --reasoning-budget 2048: düşünme kipinde döngüye giren modeli sınırlar
# --host 127.0.0.1 ve --cors-origins localhost: yalnızca bu bilgisayardan erişilir; dış siteler tarayıcıdan erişemez
& $LlamaServer -m $Model --alias $Ad --jinja -ngl 99 -c 32768 -np 2 --reasoning-budget 2048 `
  --host 127.0.0.1 --port $Port --cors-origins localhost --no-cors-credentials
