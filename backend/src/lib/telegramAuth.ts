import { createHmac, timingSafeEqual } from 'node:crypto'
import { HttpError } from './http'

/** Identitas customer hasil validasi Telegram WebApp initData. */
export type TelegramInitUser = {
  id: bigint
  username?: string
  name?: string
}

/** Gabungkan first_name + last_name jadi satu nama tampilan. */
function fullName(user: { first_name?: string; last_name?: string }) {
  return [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || undefined
}

/**
 * Validasi `initData` (query-string yang dikirim Telegram WebApp) sesuai spec:
 * secret = HMAC_SHA256(key="WebAppData", botToken); hash = HMAC_SHA256(secret, dataCheckString).
 * Melempar HttpError(401) bila tanda tangan tidak cocok, kedaluwarsa, atau payload rusak.
 *
 * @param maxAgeSeconds tolak initData yang `auth_date`-nya lebih tua dari ini (0 = tanpa batas).
 */
export function validateInitData(initData: string, botToken: string, maxAgeSeconds = 86400): TelegramInitUser {
  if (!botToken) throw new HttpError(401, 'Mini app belum dikonfigurasi', 'MINIAPP_DISABLED')
  if (!initData) throw new HttpError(401, 'initData kosong', 'INITDATA_INVALID')

  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) throw new HttpError(401, 'initData tidak memiliki hash', 'INITDATA_INVALID')
  params.delete('hash')

  const dataCheckString = Array.from(params.entries())
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join('\n')

  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest()
  const computed = createHmac('sha256', secret).update(dataCheckString).digest('hex')

  const expected = Buffer.from(computed, 'hex')
  const actual = Buffer.from(hash, 'hex')
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new HttpError(401, 'Tanda tangan initData tidak valid', 'INITDATA_INVALID')
  }

  if (maxAgeSeconds > 0) {
    const authDate = Number(params.get('auth_date') ?? 0)
    if (!authDate || Date.now() / 1000 - authDate > maxAgeSeconds) {
      throw new HttpError(401, 'Sesi mini app kedaluwarsa, buka ulang dari bot', 'INITDATA_EXPIRED')
    }
  }

  const rawUser = params.get('user')
  if (!rawUser) throw new HttpError(401, 'initData tidak memiliki user', 'INITDATA_INVALID')
  let user: { id?: number | string; username?: string; first_name?: string; last_name?: string }
  try {
    user = JSON.parse(rawUser)
  } catch {
    throw new HttpError(401, 'User initData rusak', 'INITDATA_INVALID')
  }
  if (user.id == null) throw new HttpError(401, 'User initData tanpa id', 'INITDATA_INVALID')

  return { id: BigInt(user.id), username: user.username ?? undefined, name: fullName(user) }
}
