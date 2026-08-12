import { config } from '../config'

/**
 * Throttle in-memory untuk endpoint publik tanpa autentikasi.
 *
 * Dipakai sebagai `store` kustom `@fastify/rate-limit`. Pembagian perannya:
 * plugin mengurus pemasangan hook, 429, `Retry-After` + header `RateLimit-*`;
 * modul ini yang memutuskan APA yang dihitung. Plugin memblokir bila
 * `current > max`, jadi `incr()` mengembalikan "urutan percobaan yang sedang
 * berlangsung" — bukan sekadar hitungan mentah.
 *
 * Dua semantik dalam satu store, dipilih lewat prefix kunci:
 *
 * - `login:` — hanya menghitung KEGAGALAN, dan direset saat login sukses. Kalau
 *   tiap request dihitung, admin yang login-logout wajar ikut kehabisan jatah.
 *   Karena itu `incr()` di jalur ini bersifat BACA-SAJA; kenaikan datang dari
 *   handler login lewat `recordLoginFailure()`.
 * - selain itu — laju request biasa, menghitung setiap panggilan.
 *
 * Prefix dipakai (bukan store terpisah per route) karena plugin hanya membaca
 * opsi `store` saat registrasi; `config.rateLimit` per route tidak bisa
 * mengganti store, hanya memanggil `child()` pada store yang sama.
 *
 * Proses backend hanya satu (bot + API + cron), jadi Map in-memory sudah cukup.
 * Konsekuensinya hitungan hilang saat restart — trade-off yang disengaja.
 */

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

const LOGIN_PREFIX = 'login:'
const PAIR = 'pair:'
const PER_IP = 'ip:'
const REQUEST = 'req:'

/** Jam yang bisa diganti di test — pola yang sama dengan registerTelegramSender. */
let clock: () => number = Date.now
export function setThrottleClock(fn: (() => number) | null): void {
  clock = fn ?? Date.now
}

/**
 * Kunci login: prefix + IP + username. encodeURIComponent menjamin '|' hanya
 * muncul sebagai pemisah, sehingga IP selalu bisa dipisahkan lagi.
 */
export function loginKey(ip: string, username: string): string {
  return `${LOGIN_PREFIX}${ip}|${encodeURIComponent(username.trim().toLowerCase())}`
}

function ipOfLoginKey(key: string): string {
  const withoutPrefix = key.slice(LOGIN_PREFIX.length)
  const sep = withoutPrefix.indexOf('|')
  return sep === -1 ? withoutPrefix : withoutPrefix.slice(0, sep)
}

/** Hitungan + sisa ttl tanpa membuat bucket baru. */
function peek(key: string, now: number, windowMs: number): { count: number; ttl: number } {
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) return { count: 0, ttl: windowMs }
  return { count: bucket.count, ttl: bucket.resetAt - now }
}

/** Naikkan hitungan; hit berikutnya TIDAK memperpanjang jendela. */
function bump(key: string, now: number, windowMs: number): Bucket {
  prune(now)
  const existing = buckets.get(key)
  if (existing && existing.resetAt > now) {
    existing.count += 1
    return existing
  }
  const fresh: Bucket = { count: 1, resetAt: now + windowMs }
  buckets.set(key, fresh)
  return fresh
}

/**
 * Buang bucket kedaluwarsa. Sengaja lazy saat tulis, bukan setInterval —
 * timer yang menggantung bisa membuat worker vitest tidak mau keluar.
 */
function prune(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

/** Catat satu login gagal untuk kedua penghitung (pasangan IP+user, dan IP). */
export function recordLoginFailure(ip: string, username: string): void {
  const now = clock()
  bump(PAIR + loginKey(ip, username), now, config.loginRateWindowMs)
  bump(PER_IP + ip, now, config.loginRateWindowMs)
}

/**
 * Login berhasil → bersihkan hitungan pasangan IP+user.
 *
 * Penghitung per-IP sengaja TIDAK ikut direset: kalau ikut, penyerang tinggal
 * login ke akunnya sendiri untuk menghapus jejak password spraying.
 */
export function recordLoginSuccess(ip: string, username: string): void {
  buckets.delete(PAIR + loginKey(ip, username))
}

/** Kosongkan seluruh state — dipakai test lewat resetDb(). */
export function resetThrottleStore(): void {
  buckets.clear()
}

type IncrCallback = (error: Error | null, result?: { current: number; ttl: number }) => void

export class ThrottleStore {
  /** Store tunggal untuk seluruh plugin; child() cukup mengembalikan dirinya. */
  child(): ThrottleStore {
    return this
  }

  // timeWindow/max opsional: tipe plugin mendeklarasikan incr(key, callback),
  // sementara implementasi JS-nya memanggil dengan (key, callback, timeWindow, max).
  incr(key: string, callback: IncrCallback, timeWindow?: number, max?: number): void {
    const now = clock()
    const windowMs = timeWindow || config.loginRateWindowMs

    if (key.startsWith(LOGIN_PREFIX)) {
      const limit = max ?? config.loginRateMax

      // Batas per-IP punya ambang sendiri (lebih longgar) untuk menahan password
      // spraying lintas username. Plugin hanya mengenal satu `max`, jadi saat
      // batas IP terlampaui store mengembalikan nilai di atas max untuk memaksa
      // blokir.
      const perIp = peek(PER_IP + ipOfLoginKey(key), now, windowMs)
      if (perIp.count + 1 > config.loginRateIpMax) {
        callback(null, { current: limit + 1, ttl: perIp.ttl })
        return
      }

      // Baca-saja: `current` = urutan percobaan yang sedang berjalan, sehingga
      // dengan max=5 percobaan ke-6 yang pertama kali diblokir.
      const pair = peek(PAIR + key, now, windowMs)
      callback(null, { current: pair.count + 1, ttl: pair.ttl })
      return
    }

    const bucket = bump(REQUEST + key, now, timeWindow || config.miniappAuthRateWindowMs)
    callback(null, { current: bucket.count, ttl: bucket.resetAt - now })
  }
}
