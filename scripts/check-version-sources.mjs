// Menjaga VERSION tetap sama dengan keempat manifest npm yang disebut
// docs/versioning-workflow.md. Branch 2.6.0 dan 2.6.1 menaikkan VERSION dan
// CHANGELOG.md tetapi meninggalkan kedua package.json dan kedua lockfile di
// 2.5.0, jadi image yang ter-deploy melaporkan versi produk dua rilis di
// belakang selama berbulan-bulan tanpa ada yang gagal. Sekarang CI menolaknya.
//
// CHANGELOG.md sengaja tidak ikut diperiksa: entry rilisnya sah berada di
// branch perubahan yang berbeda dari branch yang menaikkan versinya.
import { readFileSync } from 'node:fs'

const root = new URL('../', import.meta.url)
const read = (path) => readFileSync(new URL(path, root), 'utf8')
const json = (path) => JSON.parse(read(path))

const expected = read('VERSION').trim()

// Lockfile menyimpan versi paket di dua tempat; npm version memperbarui keduanya,
// suntingan manual sering hanya menyentuh yang pertama.
const sources = [
  ['backend/package.json', json('backend/package.json').version],
  ['backend/package-lock.json', json('backend/package-lock.json').version],
  ['backend/package-lock.json (packages."")', json('backend/package-lock.json').packages[''].version],
  ['frontend/package.json', json('frontend/package.json').version],
  ['frontend/package-lock.json', json('frontend/package-lock.json').version],
  ['frontend/package-lock.json (packages."")', json('frontend/package-lock.json').packages[''].version],
]

const drifted = sources.filter(([, version]) => version !== expected)

if (drifted.length) {
  console.error(`Version sources tidak sama dengan VERSION (${expected}):`)
  for (const [name, version] of drifted) console.error(`  ${name}: ${version}`)
  console.error('')
  console.error('Sinkronkan dari root repo, lalu commit hasilnya:')
  console.error(`  npm --prefix backend version ${expected} --no-git-tag-version`)
  console.error(`  npm --prefix frontend version ${expected} --no-git-tag-version`)
  process.exit(1)
}

console.log(`Version sources sama: ${expected}`)
