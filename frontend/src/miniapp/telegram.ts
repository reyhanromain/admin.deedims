// Pembungkus tipis Telegram WebApp SDK (telegram-web-app.js) + fallback dev.
// Saat dibuka di browser biasa, `window.Telegram` tidak ada → pakai ?devUserId=.

interface TelegramWebApp {
  initData: string
  initDataUnsafe?: { user?: { id: number; username?: string; first_name?: string; last_name?: string } }
  ready: () => void
  expand: () => void
  colorScheme?: string
  themeParams?: Record<string, string>
  setHeaderColor?: (color: string) => void
  setBackgroundColor?: (color: string) => void
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp }
  }
}

const webApp = (): TelegramWebApp | undefined =>
  typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined

/** Panggil saat mount: tandai siap + expand ke tinggi penuh. */
export function initTelegram() {
  const tg = webApp()
  if (!tg) return
  try {
    tg.ready()
    tg.expand()
  } catch {
    /* abaikan — SDK mungkin versi lama */
  }
}

/** initData mentah (query-string bertanda tangan) untuk dikirim ke /api/miniapp/auth. */
export function getInitData(): string {
  return webApp()?.initData ?? ''
}

/** Profil pengguna Telegram (untuk prefill nama checkout), bila tersedia. */
export function getTelegramUser() {
  const u = webApp()?.initDataUnsafe?.user
  if (!u) return null
  const name = [u.first_name, u.last_name].filter(Boolean).join(' ').trim()
  return { id: u.id, username: u.username, name: name || undefined }
}

/** Dev: ambil ?devUserId= dari URL agar mini app bisa dites tanpa Telegram. */
export function getDevUserId(): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('devUserId')
}

export const isTelegram = () => Boolean(webApp())
