import { Bot, type Context } from 'grammy'
import { prisma } from '../db'
import { config } from './../config'

/** Tipe pesan sederhana dari sebuah update Telegram (untuk kolom message_type). */
function messageType(ctx: Context): string {
  const m = ctx.message
  if (!m) return ctx.callbackQuery ? 'callback' : 'other'
  if (m.photo) return 'photo'
  if (m.sticker) return 'sticker'
  if (m.location) return 'location'
  if (m.contact) return 'contact'
  if (m.document) return 'document'
  if (typeof m.text === 'string' && m.text.startsWith('/')) return 'command'
  if (m.text) return 'text'
  return 'other'
}

/** Catat satu pesan masuk ke bot_messages. raw_payload menyimpan update mentah. */
async function logIncoming(ctx: Context) {
  const from = ctx.from
  const chat = ctx.chat
  if (!chat) return

  const text = ctx.message?.text ?? ctx.message?.caption ?? ctx.callbackQuery?.data ?? null
  const isCommand = messageType(ctx) === 'command'

  // Tautkan ke Customer kalau sudah dikenal (best-effort, relasi opsional).
  const customer = from
    ? await prisma.customer.findUnique({ where: { telegramUserId: BigInt(from.id) } })
    : null

  await prisma.botMessage.create({
    data: {
      telegramMessageId: ctx.message ? BigInt(ctx.message.message_id) : null,
      telegramChatId: BigInt(chat.id),
      telegramUserId: from ? BigInt(from.id) : null,
      direction: 'incoming',
      messageType: messageType(ctx),
      text,
      telegramUsername: from?.username ?? null,
      customerName: from ? [from.first_name, from.last_name].filter(Boolean).join(' ') || null : null,
      isCommand,
      command: isCommand && text ? text.split(/\s/)[0] : null,
      customerId: customer?.id ?? null,
      telegramDate: ctx.message ? new Date(ctx.message.date * 1000) : new Date(),
      rawPayload: JSON.stringify(ctx.update),
    },
  })
}

/** Buat bot grammY. Mengembalikan null bila BOT_TOKEN kosong (mode API-only). */
export function createBot(): Bot | null {
  if (!config.botToken) return null
  const bot = new Bot(config.botToken)

  // Log semua pesan masuk lebih dulu, lalu lanjut ke handler lain.
  bot.on('message', async (ctx, next) => {
    try {
      await logIncoming(ctx)
    } catch (err) {
      console.error('Gagal mencatat bot_message:', err)
    }
    await next()
  })

  bot.command('start', (ctx) => ctx.reply('Halo kak 👋 Selamat datang di Deedims!'))

  return bot
}
