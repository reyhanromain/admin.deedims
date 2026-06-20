import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createBot } from '../src/bot'
import { registerTelegramSender } from '../src/bot/notifications'
import { prisma, resetDb } from './helpers'

beforeEach(resetDb)
afterEach(() => registerTelegramSender(null))

function testBot(options: { deleteFails?: boolean } = {}) {
  const bot = createBot('123456:test-token')!
  const sent: Array<{ method: string; payload: Record<string, unknown> }> = []
  let nextMessageId = 10
  bot.api.config.use(async (_previous, method, payload) => {
    sent.push({ method, payload: payload as Record<string, unknown> })
    if (method === 'getMe') return { ok: true, result: { id: 123456, is_bot: true, first_name: 'Deedims', username: 'deedims_test_bot' } } as any
    if (method === 'sendMessage') return {
      ok: true,
      result: {
        message_id: nextMessageId++,
        date: Math.floor(Date.now() / 1000),
        chat: { id: Number(payload.chat_id), type: 'private', first_name: 'Budi' },
        text: payload.text,
      },
    } as any
    if (method === 'deleteMessage') {
      if (options.deleteFails) throw new Error('delete failed')
      return { ok: true, result: true } as any
    }
    if (method === 'answerCallbackQuery' || method === 'editMessageText' || method === 'editMessageCaption' || method === 'editMessageMedia') return { ok: true, result: true } as any
    throw new Error(`Unexpected Telegram API method: ${method}`)
  })
  return { bot, sent }
}

function messageUpdate(text: string, messageId = 1) {
  return {
    update_id: messageId,
    message: {
      message_id: messageId,
      date: Math.floor(Date.now() / 1000),
      chat: { id: 222, type: 'private' as const, first_name: 'Budi' },
      from: { id: 222, is_bot: false, first_name: 'Budi', username: 'budi' },
      text,
      entities: text.startsWith('/') ? [{ offset: 0, length: text.length, type: 'bot_command' as const }] : undefined,
    },
  }
}

function callbackUpdate(data: string, updateId: number, buttonLabel?: string) {
  return {
    update_id: updateId,
    callback_query: {
      id: `callback-${updateId}`,
      chat_instance: 'test',
      from: { id: 222, is_bot: false, first_name: 'Budi', username: 'budi' },
      data,
      message: {
        message_id: 10,
        date: Math.floor(Date.now() / 1000),
        chat: { id: 222, type: 'private' as const, first_name: 'Budi' },
        from: { id: 123456, is_bot: true, first_name: 'Deedims', username: 'deedims_test_bot' },
        text: 'menu',
        reply_markup: buttonLabel ? { inline_keyboard: [[{ text: buttonLabel, callback_data: data }]] } : undefined,
      },
    },
  }
}

describe('grammY customer handlers', () => {
  it('/start membaca availability dan mencatat incoming/outgoing', async () => {
    const { bot, sent } = testBot()
    await bot.init()
    await bot.handleUpdate(messageUpdate('/start'))

    const response = sent.find((call) => call.method === 'sendMessage')?.payload.text
    expect(response).toContain('Pre-order sedang dibuka')
    expect(await prisma.customer.findUnique({ where: { telegramUserId: 222n } })).toMatchObject({ username: 'budi', name: 'Budi' })
    expect(await prisma.botMessage.count({ where: { telegramUserId: 222n, direction: 'incoming' } })).toBe(1)
    expect(await prisma.botMessage.count({ where: { telegramUserId: 222n, direction: 'outgoing' } })).toBe(1)
  })

  it('/order mengirim inline menu dan unknown text mendapat fallback', async () => {
    const { bot, sent } = testBot()
    await bot.init()
    await bot.handleUpdate(messageUpdate('/order'))
    await bot.handleUpdate(messageUpdate('halo?', 2))

    const messages = sent.filter((call) => call.method === 'sendMessage').map((call) => call.payload)
    expect(messages[0].text).toContain('Silakan pilih menu')
    expect(JSON.stringify(messages[0].reply_markup)).toContain('Menu A')
    expect(messages[1].text).toContain('belum dikenali')
  })

  it('subscribe reminder melalui command bersifat idempotent', async () => {
    const { bot, sent } = testBot()
    await bot.init()
    await bot.handleUpdate(messageUpdate('/remind_preorder'))
    await bot.handleUpdate(messageUpdate('/remind_preorder', 2))

    expect(await prisma.reminderSubscriber.findUnique({ where: { telegramUserId: 222n } })).toMatchObject({ isActive: true })
    const texts = sent.filter((call) => call.method === 'sendMessage').map((call) => String(call.payload.text))
    expect(texts[0]).toContain('akan dikabari')
    expect(texts[1]).toContain('sudah masuk list')
  })

  it('callback add-to-cart membawa selection stateless dan menulis cart', async () => {
    const { bot, sent } = testBot()
    await bot.init()
    const variant = await prisma.menuVariant.findFirstOrThrow({ where: { menuId: 1 } })
    await bot.handleUpdate(messageUpdate('/order'))
    await bot.handleUpdate(callbackUpdate(`o:add:${variant.id}:2:0:1`, 2))

    expect(await prisma.cartItem.findFirst({ where: { telegramUserId: 222n } })).toMatchObject({ menuVariantId: variant.id, quantity: 2 })
    expect(sent.some((call) => call.method === 'editMessageText' && String(call.payload.text).includes('Berhasil ditambahkan'))).toBe(true)
    expect(sent.filter((call) => call.method === 'sendMessage')).toHaveLength(1)
    expect(sent.some((call) => call.method === 'editMessageText' && String(call.payload.text).includes('menu lain dengan /order'))).toBe(true)
    expect((await prisma.customer.findUniqueOrThrow({ where: { telegramUserId: 222n } })).activeOrderMessageId).toBeNull()
  })

  it('quantity menampilkan isi stock, label satuan, dan preview variant', async () => {
    const { bot, sent } = testBot()
    await bot.init()
    const variant = await prisma.menuVariant.findFirstOrThrow({ where: { menuId: 1 } })
    await prisma.stockItem.update({ where: { id: 1 }, data: { unit: 'pcs', name: 'Dimsum' } })
    await prisma.menu.update({ where: { id: 1 }, data: { name: 'Dimsum Mentai', unitLabel: 'pack' } })
    await prisma.menu.update({ where: { id: 2 }, data: { name: 'Chili Oil' } })
    await prisma.menuVariant.update({ where: { id: variant.id }, data: { imageUrl: 'https://example.com/variant.png' } })
    await prisma.menuAddon.create({ data: { menuId: 1, addonMenuId: 2, isFree: true } })
    await bot.handleUpdate(messageUpdate('/order'))
    await bot.handleUpdate(callbackUpdate(`o:v:${variant.id}:1`, 2))
    await bot.handleUpdate(callbackUpdate(`o:q:${variant.id}:2:1`, 3))

    const edits = sent.filter((call) => call.method === 'editMessageText' || call.method === 'editMessageMedia').map((call) => call.payload)
    const firstBody = (edits[0].text ?? edits[0].caption ?? edits[0].media?.caption ?? '') as string
    const secondBody = (edits[1].text ?? edits[1].caption ?? edits[1].media?.caption ?? '') as string
    expect(firstBody).toContain('Isi: 2 pcs Dimsum')
    expect(JSON.stringify(edits[0])).toContain('Add 1 pack')
    expect(sent.some((call) => call.method === 'editMessageMedia' && JSON.stringify(call.payload).includes('variant.png'))).toBe(true)
    expect(secondBody).toContain('- Chili Oil x2 (Free)')
    expect(JSON.stringify(edits[1])).not.toContain('Gratis')
    expect(JSON.stringify(edits[1])).toContain('Rp5.000')
  })

  it('callback disimpan memakai label tombol, sementara raw payload tetap tersedia', async () => {
    const { bot } = testBot()
    await bot.init()
    await bot.handleUpdate(messageUpdate('/order'))
    await bot.handleUpdate(callbackUpdate('o:p:1', 2, 'Kembali ke menu'))

    const message = await prisma.botMessage.findFirstOrThrow({ where: { direction: 'incoming', messageType: 'callback' }, orderBy: { id: 'desc' } })
    expect(message.text).toBe('Kembali ke menu')
    expect(message.rawPayload).toContain('o:p:1')
  })

  it('command utama menghapus flow order aktif', async () => {
    const { bot, sent } = testBot()
    await bot.init()
    await bot.handleUpdate(messageUpdate('/order'))
    await bot.handleUpdate(messageUpdate('/carts', 2))

    expect(sent.some((call) => call.method === 'deleteMessage' && call.payload.message_id === 10)).toBe(true)
    expect((await prisma.customer.findUniqueOrThrow({ where: { telegramUserId: 222n } })).activeOrderMessageId).toBeNull()
  })

  it('jika delete gagal, flow order diubah menjadi italic dan keyboard dikosongkan', async () => {
    const { bot, sent } = testBot({ deleteFails: true })
    await bot.init()
    await bot.handleUpdate(messageUpdate('/order'))
    await bot.handleUpdate(messageUpdate('/my_orders', 2))

    const fallback = sent.find((call) => call.method === 'editMessageText' && call.payload.text === '<i>Pesan ini dibatalkan</i>')
    expect(fallback?.payload).toMatchObject({ parse_mode: 'HTML', reply_markup: { inline_keyboard: [] } })
  })
})
