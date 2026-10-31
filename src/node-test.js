import { spawnSync } from 'node:child_process'

export function nodeTestCalistir(dizin, dosyalar, raporcu) {
  // Bu program kendisi `node --test` altında çalışırken Node, alt süreçlere NODE_TEST_CONTEXT geçirir ve
  // içteki çalıştırıcı TAP yerine üst sürece özel bir biçimde rapor verir. Bu değişken temizlenir.
  const { NODE_TEST_CONTEXT, ...ortam } = process.env
  const calisma = spawnSync(process.execPath, ['--test', `--test-reporter=${raporcu}`, ...dosyalar], {
    cwd: dizin,
    env: ortam,
    encoding: 'utf8',
    timeout: 30_000,
  })
  return { durum: calisma.status, stdout: calisma.stdout ?? '', stderr: calisma.stderr ?? '' }
}
