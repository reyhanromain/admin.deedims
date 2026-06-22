import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { validateInitData } from '../../src/lib/telegramAuth'

const BOT_TOKEN = '123456:TEST-bot-token'

/** Bangun initData valid (bertanda tangan) untuk token uji, seperti yang dikirim Telegram. */
function buildInitData(fields: Record<string, string>): string {
  const dataCheckString = Object.entries(fields)
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n')
  const secret = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest()
  const hash = createHmac('sha256', secret).update(dataCheckString).digest('hex')
  const params = new URLSearchParams({ ...fields, hash })
  return params.toString()
}

const now = () => String(Math.floor(Date.now() / 1000))
const user = JSON.stringify({ id: 111, username: 'sari', first_name: 'Sari', last_name: 'W' })

describe('validateInitData', () => {
  it('initData valid → user terparse (id bigint, nama gabungan)', () => {
    const initData = buildInitData({ auth_date: now(), user })
    const result = validateInitData(initData, BOT_TOKEN)
    expect(result).toMatchObject({ id: 111n, username: 'sari', name: 'Sari W' })
  })

  it('hash dipalsukan → 401', () => {
    const initData = buildInitData({ auth_date: now(), user }).replace(/hash=[a-f0-9]+/, 'hash=deadbeef')
    expect(() => validateInitData(initData, BOT_TOKEN)).toThrow(/tidak valid|hash/i)
  })

  it('auth_date kedaluwarsa → 401', () => {
    const old = String(Math.floor(Date.now() / 1000) - 100000)
    const initData = buildInitData({ auth_date: old, user })
    expect(() => validateInitData(initData, BOT_TOKEN, 86400)).toThrow(/kedaluwarsa/i)
  })

  it('botToken kosong → MINIAPP_DISABLED', () => {
    expect(() => validateInitData('', '')).toThrow(/dikonfigurasi/i)
  })
})
