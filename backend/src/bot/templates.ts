import { prisma } from '../db'

export type TemplateKey = keyof typeof BOT_MESSAGE_TEMPLATES

type TemplateDefinition = {
  label: string
  description: string
  category: string
  defaultValue: string
  placeholders?: readonly string[]
  sortOrder: number
}

export const BOT_MESSAGE_TEMPLATES = {
  start_closed: {
    label: 'start_closed', category: 'bot_messages_start', sortOrder: 101,
    description: 'Balasan /start saat pre-order belum dibuka.',
    defaultValue: '{{intro}}\n\nSaat ini pre-order belum dibuka ya kak.\n\nKalau kakak mau dikabari saat pre-order berikutnya dibuka, silakan kirim /remind_preorder.',
    placeholders: ['intro'],
  },
  start_empty_menu: {
    label: 'start_empty_menu', category: 'bot_messages_start', sortOrder: 102,
    description: 'Balasan /start saat pre-order terbuka tetapi menu belum tersedia.',
    defaultValue: '{{intro}}\n\nPre-order sedang dibuka, tapi menu yang bisa dipesan belum tersedia ya kak.\nSilakan cek lagi nanti.',
    placeholders: ['intro'],
  },
  start_open: {
    label: 'start_open', category: 'bot_messages_start', sortOrder: 103,
    description: 'Balasan /start saat pre-order terbuka.',
    defaultValue: '{{intro}}\n\nPre-order sedang dibuka ya kak 🎉\n\n{{preorder_title}}\n{{preorder_description}}{{fulfillment_week}}{{fulfillment_note}}\n\nSilakan kirim /order untuk memesan ya kak.',
    placeholders: ['intro', 'preorder_title', 'preorder_description', 'fulfillment_week', 'fulfillment_note'],
  },
  reminder_subscribed: {
    label: 'reminder_subscribed', category: 'bot_messages_reminder', sortOrder: 201,
    description: 'Balasan saat customer berhasil subscribe reminder.',
    defaultValue: 'Siap kak 😊\nNanti kalau pre-order Deedims sudah dibuka, kakak akan dikabari di sini ya.\n\nKalau nanti tidak ingin menerima reminder lagi, kakak bisa kirim /stop_preorder_reminder.',
  },
  reminder_already_subscribed: {
    label: 'reminder_already_subscribed', category: 'bot_messages_reminder', sortOrder: 202,
    description: 'Balasan saat customer sudah subscribe reminder.',
    defaultValue: 'Kakak sudah masuk list reminder pre-order ya 😊\nNanti kalau pre-order dibuka, kakak akan dikabari di sini.\n\nKalau ingin berhenti menerima reminder, kirim /stop_preorder_reminder.',
  },
  reminder_unsubscribed: {
    label: 'reminder_unsubscribed', category: 'bot_messages_reminder', sortOrder: 203,
    description: 'Balasan saat reminder berhasil dihentikan.',
    defaultValue: 'Baik kak, reminder pre-order sudah dihentikan.\nKakak tidak akan menerima notifikasi pre-order berikutnya lagi.',
  },
  reminder_not_subscribed: {
    label: 'reminder_not_subscribed', category: 'bot_messages_reminder', sortOrder: 204,
    description: 'Balasan saat customer belum terdaftar reminder.',
    defaultValue: 'Kakak belum terdaftar di reminder pre-order ya.\nKalau ingin dikabari saat pre-order dibuka, kirim /remind_preorder.',
  },
  unknown_message: {
    label: 'unknown_message', category: 'bot_messages_general', sortOrder: 301,
    description: 'Balasan saat pesan customer tidak dikenali.',
    defaultValue: 'Maaf kak, pesan itu belum dikenali.\nSilakan gunakan /start, /order, /carts, atau /my_orders ya 😊',
  },
  business_error: {
    label: 'business_error', category: 'bot_messages_general', sortOrder: 302,
    description: 'Balasan saat validasi bisnis gagal.',
    defaultValue: 'Maaf kak, {{error_message}}\n\nSilakan coba lagi dari command utama.',
    placeholders: ['error_message'],
  },
  system_error: {
    label: 'system_error', category: 'bot_messages_general', sortOrder: 303,
    description: 'Balasan saat terjadi error sistem.',
    defaultValue: 'Terjadi kendala saat memproses permintaan kak. Silakan coba lagi sebentar lagi ya.',
  },
  stale_choice: {
    label: 'stale_choice', category: 'bot_messages_general', sortOrder: 304,
    description: 'Balasan saat tombol inline sudah tidak berlaku.',
    defaultValue: 'Pilihan tersebut sudah tidak berlaku. Silakan mulai lagi dari command utama.',
  },
  order_closed: {
    label: 'order_closed', category: 'bot_messages_order', sortOrder: 401,
    description: 'Balasan /order saat pre-order belum dibuka.',
    defaultValue: 'Saat ini pre-order belum dibuka ya kak.\nKirim /remind_preorder jika ingin mendapat kabar saat dibuka.',
  },
  order_no_menu: {
    label: 'order_no_menu', category: 'bot_messages_order', sortOrder: 402,
    description: 'Balasan /order saat belum ada menu tersedia.',
    defaultValue: 'Pre-order sedang dibuka, tapi menu yang bisa dipesan belum tersedia ya kak.',
  },
  order_menu_list: {
    label: 'order_menu_list', category: 'bot_messages_order', sortOrder: 403,
    description: 'Prompt daftar menu.',
    defaultValue: 'Silakan pilih menu yang ingin kakak pesan 😊\n\nKakak juga bisa cek keranjang sementara dengan /carts.',
  },
  add_to_cart_success: {
    label: 'add_to_cart_success', category: 'bot_messages_order', sortOrder: 404,
    description: 'Balasan setelah item masuk cart.',
    defaultValue: 'Berhasil ditambahkan ke cart kak 😊\n\nKakak bisa lanjut pilih menu lain dengan /order, atau cek keranjang dengan /carts.',
  },
  order_flow_cancel_confirm: {
    label: 'order_flow_cancel_confirm', category: 'bot_messages_order', sortOrder: 405,
    description: 'Konfirmasi membatalkan proses order aktif.',
    defaultValue: 'Kak, yakin mau membatalkan proses order ini?\n\nKalau dilanjutkan, semua isi cart kakak akan dikosongkan.',
  },
  order_cancelled: {
    label: 'order_cancelled', category: 'bot_messages_order', sortOrder: 406,
    description: 'Balasan setelah proses order aktif dibatalkan.',
    defaultValue: 'Baik kak, proses order dibatalkan dan keranjang sudah dikosongkan.\n\nKalau mau mulai pesan lagi, silakan kirim /order ya 😊',
  },
  addon_prompt: {
    label: 'addon_prompt', category: 'bot_messages_order', sortOrder: 407,
    description: 'Prompt tambah add-on.',
    defaultValue: 'Mau tambah pelengkap untuk menu ini, kak?\n\n{{selection}}\n\nKalau tidak perlu tambahan, kakak bisa pilih Skip add-on.',
    placeholders: ['selection'],
  },
  cart_empty: {
    label: 'cart_empty', category: 'bot_messages_cart', sortOrder: 501,
    description: 'Balasan /carts saat keranjang kosong.',
    defaultValue: 'Keranjang kakak masih kosong.\n\nKalau mau pesan, silakan kirim /order ya 😊',
  },
  cart_empty_after_delete: {
    label: 'cart_empty_after_delete', category: 'bot_messages_cart', sortOrder: 502,
    description: 'Balasan setelah item terakhir cart dihapus.',
    defaultValue: '{{prefix}}Sekarang keranjang kakak sudah kosong.\nKalau mau mulai pesan lagi, silakan kirim /order ya 😊',
    placeholders: ['prefix'],
  },
  cart_edit_prompt: {
    label: 'cart_edit_prompt', category: 'bot_messages_cart', sortOrder: 503,
    description: 'Prompt memilih item cart untuk dihapus.',
    defaultValue: '{{prefix}}Pilih item yang ingin kakak hapus dari keranjang.\n\nSaat ini fitur edit hanya mendukung hapus item ya kak.',
    placeholders: ['prefix'],
  },
  cart_empty_confirm: {
    label: 'cart_empty_confirm', category: 'bot_messages_cart', sortOrder: 504,
    description: 'Konfirmasi mengosongkan keranjang.',
    defaultValue: 'Kak, yakin mau mengosongkan keranjang?\n\nSemua menu dan add-on yang sudah kakak pilih akan dihapus dari keranjang.',
  },
  cart_emptied: {
    label: 'cart_emptied', category: 'bot_messages_cart', sortOrder: 505,
    description: 'Balasan setelah cart dikosongkan.',
    defaultValue: 'Keranjang berhasil dikosongkan kak.\n\nKalau kakak mau pesan lagi, silakan kirim /order ya 😊',
  },
  payment_prompt: {
    label: 'payment_prompt', category: 'bot_messages_cart', sortOrder: 506,
    description: 'Prompt memilih metode pembayaran.',
    defaultValue: 'Pilih metode pembayaran ya kak.\n\nTotal pembayaran: {{total}}{{price_changed}}\n\nUntuk saat ini metode pembayaran yang tersedia adalah COD.',
    placeholders: ['total', 'price_changed'],
  },
  checkout_success: {
    label: 'checkout_success', category: 'bot_messages_cart', sortOrder: 507,
    description: 'Balasan setelah checkout berhasil.',
    defaultValue: 'Order berhasil dibuat kak 🎉\n\nKode order: {{order_code}}\nTotal pembayaran: {{total}}\nMetode pembayaran: COD\n\nKakak bisa cek status order dengan /my_orders.',
    placeholders: ['order_code', 'total'],
  },
  my_orders_empty: {
    label: 'my_orders_empty', category: 'bot_messages_my_orders', sortOrder: 601,
    description: 'Balasan /my_orders saat belum ada order.',
    defaultValue: 'Kakak belum punya order di Deedims.\n\nKalau mau pesan, silakan kirim /order ya 😊',
  },
  my_orders_list_header: {
    label: 'my_orders_list_header', category: 'bot_messages_my_orders', sortOrder: 602,
    description: 'Header daftar order.',
    defaultValue: 'Order kakak di Deedims 📦\n\nPilih salah satu order untuk lihat detailnya.\n',
  },
  order_cancel_confirm: {
    label: 'order_cancel_confirm', category: 'bot_messages_my_orders', sortOrder: 603,
    description: 'Konfirmasi pembatalan order submitted.',
    defaultValue: 'Kak, yakin mau membatalkan order ini?\n\nKalau dibatalkan, order ini tidak akan diproses.',
  },
  order_cancel_success: {
    label: 'order_cancel_success', category: 'bot_messages_my_orders', sortOrder: 604,
    description: 'Balasan setelah order berhasil dibatalkan.',
    defaultValue: 'Order {{order_code}} berhasil dibatalkan kak.\n\nKalau mau pesan lagi, silakan kirim /order ya 😊',
    placeholders: ['order_code'],
  },
  order_cancel_request_sent: {
    label: 'order_cancel_request_sent', category: 'bot_messages_my_orders', sortOrder: 605,
    description: 'Balasan setelah request cancel dikirim.',
    defaultValue: 'Permintaan pembatalan sudah dikirim ke admin ya kak.',
  },
  order_cancel_request_exists: {
    label: 'order_cancel_request_exists', category: 'bot_messages_my_orders', sortOrder: 606,
    description: 'Balasan saat request cancel sudah ada.',
    defaultValue: 'Permintaan pembatalan order ini sudah menunggu review admin.',
  },
  reorder_success: {
    label: 'reorder_success', category: 'bot_messages_my_orders', sortOrder: 607,
    description: 'Balasan setelah reorder berhasil masuk cart.',
    defaultValue: 'Order sebelumnya berhasil dimasukkan ke keranjang kak 😊{{notes}}\n\nSilakan cek keranjang dengan /carts sebelum checkout.',
    placeholders: ['notes'],
  },
} as const satisfies Record<string, TemplateDefinition>

export const MESSAGE_TEMPLATE_KEYS = new Set(Object.keys(BOT_MESSAGE_TEMPLATES))

const editorAllowedTags = new Set(['b', 'strong', 'i', 'em', 'u', 'ins', 's', 'strike', 'del', 'code', 'pre', 'a', 'br', 'p'])
const placeholderPattern = /{{\s*([a-zA-Z0-9_]+)\s*}}/g

export function templatePlaceholders(label: string) {
  const definition = templateDefinition(label)
  return definition?.placeholders ? [...definition.placeholders] : []
}

export function validateTemplateValue(label: string, value: string) {
  const definition = templateDefinition(label)
  if (!definition) return
  const allowed = new Set(definition.placeholders ?? [])
  const unknown = [...value.matchAll(placeholderPattern)].map((match) => match[1]).filter((name) => !allowed.has(name))
  if (unknown.length) throw new Error(`Placeholder tidak dikenal: ${[...new Set(unknown)].join(', ')}`)
  validateTelegramEditorHtml(value)
}

export async function renderTemplate(label: TemplateKey, values: Record<string, unknown> = {}) {
  const definition = templateDefinition(label)!
  const row = await prisma.setting.findUnique({ where: { label } })
  const template = row?.value || definition.defaultValue
  return normalizeEditorHtml(template).replace(placeholderPattern, (_token, name: string) => htmlEscape(String(values[name] ?? '')))
}

export async function upsertBotMessageTemplates() {
  for (const template of Object.values(BOT_MESSAGE_TEMPLATES) as TemplateDefinition[]) {
    await prisma.setting.upsert({
      where: { label: template.label },
      create: {
        label: template.label,
        description: template.description,
        value: template.defaultValue,
        inputType: 'html',
        category: template.category,
        placeholders: JSON.stringify(template.placeholders ?? []),
        sortOrder: template.sortOrder,
      },
      update: {
        description: template.description,
        inputType: 'html',
        category: template.category,
        placeholders: JSON.stringify(template.placeholders ?? []),
        sortOrder: template.sortOrder,
      },
    })
  }
}

function templateDefinition(label: string): TemplateDefinition | undefined {
  return BOT_MESSAGE_TEMPLATES[label as TemplateKey] as TemplateDefinition | undefined
}

function validateTelegramEditorHtml(value: string) {
  for (const tag of value.matchAll(/<\/?\s*([a-zA-Z0-9-]+)(?:\s[^>]*)?>/g)) {
    const name = tag[1].toLowerCase()
    if (!editorAllowedTags.has(name)) throw new Error(`Tag HTML tidak didukung Telegram: ${name}`)
    if (name === 'a' && !/^<\s*a\s+href=("[^"]+"|'[^']+')\s*>$/i.test(tag[0])) throw new Error('Link hanya boleh memakai atribut href')
    if (!['a', 'br'].includes(name) && /\s[a-zA-Z-]+\s*=/.test(tag[0])) throw new Error(`Atribut HTML tidak didukung pada tag ${name}`)
  }
}

function normalizeEditorHtml(value: string) {
  return value
    .replace(/<p>\s*<\/p>/gi, '\n')
    .replace(/<p>/gi, '')
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .trim()
}

function htmlEscape(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
