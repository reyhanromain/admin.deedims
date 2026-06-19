import path from 'node:path'
import { Bot, Context, InlineKeyboard, InputFile, type Context as GrammyContext } from 'grammy'
import { prisma } from '../db'
import { config } from '../config'
import { formatJakarta } from '../time'
import {
  BotBusinessError,
  addToCart,
  cancelSubmittedOrder,
  checkout,
  checkoutPreview,
  clearCart,
  customerOrderDetail,
  deleteCartItem,
  ensureCustomer,
  getCart,
  listCustomerOrders,
  listOrderableMenus,
  maxAddableQuantity,
  openPreOrder,
  reorderCompleted,
  requestOrderCancellation,
  setting,
  subscribeReminder,
  unsubscribeReminder,
  visibleVariantName,
  type TelegramCustomer,
} from './service'
import { registerTelegramSender, sendTelegramMessage } from './notifications'

function messageType(ctx: GrammyContext): string {
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

async function logIncoming(ctx: GrammyContext) {
  const from = ctx.from
  const chat = ctx.chat
  if (!chat) return
  const text = ctx.message?.text ?? ctx.message?.caption ?? ctx.callbackQuery?.data ?? null
  const isCommand = messageType(ctx) === 'command'
  const customer = from ? await prisma.customer.findUnique({ where: { telegramUserId: BigInt(from.id) } }) : null
  await prisma.botMessage.create({
    data: {
      telegramMessageId: ctx.message ? BigInt(ctx.message.message_id) : ctx.callbackQuery?.message ? BigInt(ctx.callbackQuery.message.message_id) : null,
      telegramChatId: BigInt(chat.id),
      telegramUserId: from ? BigInt(from.id) : null,
      direction: 'incoming',
      messageType: messageType(ctx),
      text,
      telegramUsername: from?.username ?? null,
      customerName: from ? fullName(from) : null,
      isCommand,
      command: isCommand && text ? text.split(/\s/)[0] : null,
      customerId: customer?.id ?? null,
      telegramDate: ctx.message ? new Date(ctx.message.date * 1000) : new Date(),
      rawPayload: JSON.stringify(ctx.update),
    },
  })
}

export function createBot(token = config.botToken): Bot | null {
  if (!token) return null
  const bot = new Bot(token)

  registerTelegramSender((chatId, text, options) => bot.api.sendMessage(
    Number(chatId),
    text,
    options as Parameters<typeof bot.api.sendMessage>[2],
  ))

  bot.on(['message', 'callback_query'], async (ctx, next) => {
    try { await logIncoming(ctx) } catch (error) { console.error('Gagal mencatat bot_message:', error) }
    await next()
  })

  bot.command('start', async (ctx) => guarded(ctx, async (user) => {
    const intro = await setting('start_quick_intro', 'Halo kak 👋\nSelamat datang di Deedims.')
    const { preOrder, menus } = await listOrderableMenus()
    if (!preOrder) return reply(ctx, `${intro}\n\nSaat ini pre-order belum dibuka ya kak.\n\nKalau kakak mau dikabari saat pre-order berikutnya dibuka, silakan kirim /remind_preorder.`)
    if (!menus.length) return reply(ctx, `${intro}\n\nPre-order sedang dibuka, tapi menu yang bisa dipesan belum tersedia ya kak.\nSilakan cek lagi nanti.`)
    return reply(ctx, [intro, '', 'Pre-order sedang dibuka ya kak 🎉', '', preOrder.title, preOrder.description,
      preOrder.fulfillmentDate ? `Pengambilan/pengiriman: ${formatJakarta(preOrder.fulfillmentDate)}` : null,
      preOrder.fulfillmentNote ? `Catatan: ${preOrder.fulfillmentNote}` : null, '', 'Kalau kakak mau pesan, silakan kirim /order ya.'].filter(Boolean).join('\n'))
  }))

  bot.command('remind_preorder', async (ctx) => guarded(ctx, async (user) => {
    const result = await subscribeReminder(user)
    return reply(ctx, result.alreadyActive
      ? 'Kakak sudah masuk list reminder pre-order ya 😊\nNanti kalau pre-order dibuka, kakak akan dikabari di sini.\n\nKalau ingin berhenti menerima reminder, kirim /stop_preorder_reminder.'
      : 'Siap kak 😊\nNanti kalau pre-order Deedims sudah dibuka, kakak akan dikabari di sini ya.\n\nKalau nanti tidak ingin menerima reminder lagi, kakak bisa kirim /stop_preorder_reminder.')
  }))

  bot.command('stop_preorder_reminder', async (ctx) => guarded(ctx, async (user) => {
    const result = await unsubscribeReminder(user.id)
    return reply(ctx, result.wasActive
      ? 'Baik kak, reminder pre-order sudah dihentikan.\nKakak tidak akan menerima notifikasi pre-order berikutnya lagi.'
      : 'Kakak belum terdaftar di reminder pre-order ya.\nKalau ingin dikabari saat pre-order dibuka, kirim /remind_preorder.')
  }))

  bot.command('order', async (ctx) => guarded(ctx, async (user) => showMenuList(ctx, user, 1, false)))
  bot.command('carts', async (ctx) => guarded(ctx, async (user) => showCart(ctx, user, false)))
  bot.command('my_orders', async (ctx) => guarded(ctx, async (user) => showOrderList(ctx, user, 1, false)))

  bot.on('callback_query:data', async (ctx) => guarded(ctx, async (user) => {
    await ctx.answerCallbackQuery().catch(() => undefined)
    await handleCallback(ctx, user, ctx.callbackQuery.data)
  }))

  bot.on('message', (ctx) => reply(ctx, 'Maaf kak, pesan itu belum dikenali.\nSilakan gunakan /start, /order, /carts, atau /my_orders ya 😊'))
  bot.catch((error) => console.error('Bot handler error:', error.error))
  return bot
}

async function handleCallback(ctx: Context, user: TelegramCustomer, data: string) {
  const p = data.split(':')
  if (p[0] === 'o') {
    if (p[1] === 'p') return showMenuList(ctx, user, positive(p[2]), true)
    if (p[1] === 'm') return showMenu(ctx, user, positive(p[2]), positive(p[3]), true)
    if (p[1] === 'v') return showQuantity(ctx, user, positive(p[2]), positive(p[3]))
    if (p[1] === 'q') return showAddons(ctx, user, positive(p[2]), positive(p[3]), positive(p[4]))
    if (p[1] === 'cf') return showAddConfirmation(ctx, positive(p[2]), positive(p[3]), Number(p[4]), positive(p[5]))
    if (p[1] === 'add') {
      await addToCart({ telegramUserId: user.id, variantId: positive(p[2]), quantity: positive(p[3]), addonVariantId: Number(p[4]) || undefined })
      await edit(ctx, 'Berhasil ditambahkan ke cart kak 😊\n\nKakak bisa lanjut pilih menu lain, atau cek keranjang dengan /carts.')
      return showMenuList(ctx, user, positive(p[5]), false)
    }
    if (p[1] === 'cancel') return edit(ctx, 'Kak, yakin mau membatalkan proses order ini?\n\nKalau dilanjutkan, semua isi cart kakak akan dikosongkan.', new InlineKeyboard().text('Yes, cancel order', 'o:cancel_yes').row().text('Back', 'o:p:1'))
    if (p[1] === 'cancel_yes') {
      await clearCart(user.id)
      return edit(ctx, 'Baik kak, proses order dibatalkan dan keranjang sudah dikosongkan.\n\nKalau mau mulai pesan lagi, silakan kirim /order ya 😊')
    }
  }
  if (p[0] === 'c') {
    if (p[1] === 'back') return showCart(ctx, user, true)
    if (p[1] === 'empty') return edit(ctx, 'Kak, yakin mau mengosongkan keranjang?\n\nSemua menu dan add-on yang sudah kakak pilih akan dihapus dari keranjang.', new InlineKeyboard().text('Yes, empty cart', 'c:empty_yes').row().text('Back', 'c:back'))
    if (p[1] === 'empty_yes') { await clearCart(user.id); return edit(ctx, 'Keranjang berhasil dikosongkan kak.\n\nKalau kakak mau pesan lagi, silakan kirim /order ya 😊') }
    if (p[1] === 'edit') return showCartEditor(ctx, user, positive(p[2]), true)
    if (p[1] === 'del') { await deleteCartItem(user.id, positive(p[2])); return showCartEditor(ctx, user, positive(p[3]), true, 'Item berhasil dihapus dari keranjang kak.\n\n') }
    if (p[1] === 'checkout') return showPayment(ctx, user)
    if (p[1] === 'cod') {
      const order = await checkout(user)
      return edit(ctx, `Order berhasil dibuat kak 🎉\n\nKode order: ${order.orderCode}\nTotal pembayaran: ${money(order.totalAmount)}\nMetode pembayaran: COD\n\nKakak bisa cek status order dengan /my_orders.`)
    }
  }
  if (p[0] === 'mo') {
    if (p[1] === 'p' || p[1] === 'refresh') return showOrderList(ctx, user, positive(p[2]), true)
    if (p[1] === 'd') return showOrderDetail(ctx, user, positive(p[2]), positive(p[3]), true)
    if (p[1] === 'cancel') return edit(ctx, `Kak, yakin mau membatalkan order ini?\n\nKalau dibatalkan, order ini tidak akan diproses.`, new InlineKeyboard().text('Yes, cancel order', `mo:cancel_yes:${p[2]}:${p[3]}`).row().text('Back', `mo:d:${p[2]}:${p[3]}`))
    if (p[1] === 'cancel_yes') { const order = await cancelSubmittedOrder(user.id, positive(p[2])); return edit(ctx, `Order ${order.orderCode} berhasil dibatalkan kak.\n\nKalau mau pesan lagi, silakan kirim /order ya 😊`) }
    if (p[1] === 'request') { const result = await requestOrderCancellation(user.id, positive(p[2])); return edit(ctx, result.alreadyRequested ? 'Permintaan pembatalan order ini sudah menunggu review admin.' : 'Permintaan pembatalan sudah dikirim ke admin ya kak.') }
    if (p[1] === 'reorder') {
      const result = await reorderCompleted(user.id, positive(p[2]))
      const notes = [result.filtered ? 'Beberapa item yang sudah tidak tersedia tidak ikut ditambahkan.' : null, result.priceChanged ? 'Ada item dengan perubahan harga, jadi total bisa berbeda dari order sebelumnya.' : null].filter(Boolean)
      return edit(ctx, `Order sebelumnya berhasil dimasukkan ke keranjang kak 😊${notes.length ? `\n\nCatatan:\n- ${notes.join('\n- ')}` : ''}\n\nSilakan cek keranjang dengan /carts sebelum checkout.`)
    }
  }
  return edit(ctx, 'Pilihan tersebut sudah tidak berlaku. Silakan mulai lagi dari command utama.')
}

async function showMenuList(ctx: Context, user: TelegramCustomer, requestedPage: number, editing: boolean) {
  const { preOrder, menus } = await listOrderableMenus()
  if (!preOrder) return respond(ctx, editing, 'Saat ini pre-order belum dibuka ya kak.\nKirim /remind_preorder jika ingin mendapat kabar saat dibuka.')
  if (!menus.length) return respond(ctx, editing, 'Pre-order sedang dibuka, tapi menu yang bisa dipesan belum tersedia ya kak.')
  const size = positive(await setting('order_menu_page_size', '8')) || 8
  const pages = Math.max(1, Math.ceil(menus.length / size))
  const page = Math.min(requestedPage, pages)
  const keyboard = new InlineKeyboard()
  for (const menu of menus.slice((page - 1) * size, page * size)) keyboard.text(menu.name, `o:m:${menu.id}:${page}`).row()
  if (pages > 1) {
    if (page > 1) keyboard.text('Prev', `o:p:${page - 1}`)
    if (page < pages) keyboard.text('Next', `o:p:${page + 1}`)
    keyboard.row()
  }
  keyboard.text('Cancel', 'o:cancel')
  return respond(ctx, editing, 'Silakan pilih menu yang ingin kakak pesan 😊\n\nKakak juga bisa cek keranjang sementara dengan /carts.', keyboard)
}

async function showMenu(ctx: Context, _user: TelegramCustomer, menuId: number, page: number, editing: boolean) {
  if (!await openPreOrder()) throw new BotBusinessError('PREORDER_CLOSED', 'Pre-order sudah tidak dibuka.')
  const menu = await prisma.menu.findFirst({ where: { id: menuId, isActive: true, isAddon: false }, include: { variants: { where: { isActive: true }, orderBy: { id: 'asc' } } } })
  if (!menu?.variants.length) throw new BotBusinessError('MENU_INVALID', 'Menu ini sudah tidak bisa dipesan.')
  const keyboard = new InlineKeyboard()
  for (const variant of menu.variants) keyboard.text(`${visibleVariantName(variant.name) ?? 'Add to cart'} - ${money(variant.price)}`, `o:v:${variant.id}:${page}`).row()
  keyboard.text('Back to menu', `o:p:${page}`).row().text('Cancel', 'o:cancel')
  const text = [menu.name, '', menu.description, '', menu.variants.length > 1 ? 'Silakan pilih varian yang kakak mau.' : 'Mau tambahkan menu ini ke cart, kak?'].filter(Boolean).join('\n')
  if (editing && (menu.telegramFileId || menu.imageUrl)) return editMenuPhoto(ctx, menu, text, keyboard)
  return respond(ctx, editing, text, keyboard)
}

async function showQuantity(ctx: Context, user: TelegramCustomer, variantId: number, page: number) {
  const capacity = await maxAddableQuantity(user.id, variantId)
  if (!capacity) throw new BotBusinessError('STOCK_INSUFFICIENT', 'Stock untuk menu ini sudah habis atau tidak cukup.')
  if (capacity === 1) return showAddons(ctx, user, variantId, 1, page)
  const variant = await prisma.menuVariant.findUniqueOrThrow({ where: { id: variantId }, include: { menu: true } })
  const keyboard = new InlineKeyboard()
  for (let qty = 1; qty <= Math.min(3, capacity); qty++) keyboard.text(`Add ${qty}`, `o:q:${variantId}:${qty}:${page}`).row()
  keyboard.text('Back', `o:m:${variant.menuId}:${page}`).row().text('Cancel', 'o:cancel')
  return edit(ctx, `${variant.menu.name}\n${visibleVariantName(variant.name) ? `Varian: ${variant.name}\n` : ''}Harga: ${money(variant.price)}\n\nPilih jumlah yang ingin ditambahkan.`, keyboard)
}

async function showAddons(ctx: Context, _user: TelegramCustomer, variantId: number, qty: number, page: number) {
  const variant = await prisma.menuVariant.findUniqueOrThrow({ where: { id: variantId }, include: { menu: true } })
  const links = await prisma.menuAddon.findMany({ where: { menuId: variant.menuId, isActive: true }, include: { addonMenu: { include: { variants: { where: { isActive: true }, orderBy: { id: 'asc' } } } } }, orderBy: { sortOrder: 'asc' } })
  const valid = links.filter((link) => link.addonMenu.isActive && link.addonMenu.variants.length)
  if (!valid.length) return showAddConfirmation(ctx, variantId, qty, 0, page)
  const keyboard = new InlineKeyboard()
  const options = new Map<number, { link: typeof valid[number]; variant: typeof valid[number]['addonMenu']['variants'][number] }>()
  for (const link of valid) for (const addonVariant of link.addonMenu.variants) {
    const current = options.get(addonVariant.id)
    if (!current || link.isFree) options.set(addonVariant.id, { link, variant: addonVariant })
  }
  for (const { link, variant: addonVariant } of options.values()) keyboard.text(`${link.addonMenu.name}${visibleVariantName(addonVariant.name) ? ` ${addonVariant.name}` : ''} - ${link.isFree ? 'Gratis' : money(addonVariant.price)}`, `o:cf:${variantId}:${qty}:${addonVariant.id}:${page}`).row()
  keyboard.text('Skip add-on', `o:cf:${variantId}:${qty}:0:${page}`).row().text('Back to menu', `o:p:${page}`).row().text('Cancel', 'o:cancel')
  return edit(ctx, `Mau tambah pelengkap untuk menu ini, kak?\n\n${variant.menu.name} x${qty}\n\nKalau tidak perlu tambahan, kakak bisa pilih Skip add-on.`, keyboard)
}

async function showAddConfirmation(ctx: Context, variantId: number, qty: number, addonVariantId: number, page: number) {
  const variant = await prisma.menuVariant.findUniqueOrThrow({ where: { id: variantId }, include: { menu: true } })
  const addon = addonVariantId ? await prisma.menuVariant.findUnique({ where: { id: addonVariantId }, include: { menu: true } }) : null
  const text = [`Berikut yang akan ditambahkan ke keranjang:`, '', `${variant.menu.name}${visibleVariantName(variant.name) ? ` (${variant.name})` : ''} x${qty}`, addon ? `Add-on: ${addon.menu.name}${visibleVariantName(addon.name) ? ` (${addon.name})` : ''} x${qty}` : 'Tanpa add-on', '', 'Mau tambahkan ke cart, kak?'].join('\n')
  const keyboard = new InlineKeyboard().text('Add to cart', `o:add:${variantId}:${qty}:${addonVariantId}:${page}`).row().text('Choose different add-on', `o:q:${variantId}:${qty}:${page}`).row().text('Back to menu', `o:p:${page}`).row().text('Cancel', 'o:cancel')
  return edit(ctx, text, keyboard)
}

async function showCart(ctx: Context, user: TelegramCustomer, editing: boolean) {
  const cart = await getCart(user.id)
  if (!cart.main.length) return respond(ctx, editing, 'Keranjang kakak masih kosong.\n\nKalau mau pesan, silakan kirim /order ya 😊')
  const lines = ['Keranjang kakak 🛒', '']
  cart.main.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.menuNameSnapshot}`, ...(item.variantNameSnapshot ? [`   Varian: ${item.variantNameSnapshot}`] : []), `   Qty: ${item.quantity}`, `   Harga: ${money(item.unitPrice)}`, `   Subtotal: ${money(item.unitPrice * item.quantity)}`)
    for (const addon of item.addons) lines.push(`   Add-on: ${addon.menuNameSnapshot}${addon.variantNameSnapshot ? ` (${addon.variantNameSnapshot})` : ''} x${addon.quantity} — ${money(addon.unitPrice * addon.quantity)}`)
    lines.push('')
  })
  lines.push(`Total harga: ${money(cart.total)}`, '', 'Total stock di keranjang:')
  for (const stock of cart.stock) lines.push(`- ${stock.name}: ${stock.required} ${stock.unit ?? ''} / tersedia ${stock.available} ${stock.unit ?? ''}`)
  lines.push('', `Status stock: ${cart.stockSufficient ? 'Cukup' : 'Tidak cukup'}`)
  const keyboard = new InlineKeyboard()
  if (cart.stockSufficient) keyboard.text('Check out', 'c:checkout').row()
  else keyboard.text('Edit Cart', 'c:edit:1').row()
  keyboard.text('Empty cart', 'c:empty')
  return respond(ctx, editing, lines.join('\n'), keyboard)
}

async function showCartEditor(ctx: Context, user: TelegramCustomer, requestedPage: number, editing: boolean, prefix = '') {
  const cart = await getCart(user.id)
  if (!cart.main.length) return respond(ctx, editing, `${prefix}Sekarang keranjang kakak sudah kosong.\nKalau mau mulai pesan lagi, silakan kirim /order ya 😊`)
  const size = positive(await setting('cart_edit_page_size', '8')) || 8
  const pages = Math.max(1, Math.ceil(cart.main.length / size)); const page = Math.min(requestedPage, pages)
  const keyboard = new InlineKeyboard()
  for (const [index, item] of cart.main.slice((page - 1) * size, page * size).entries()) keyboard.text(`${(page - 1) * size + index + 1}. ${item.menuNameSnapshot} x${item.quantity}`, `c:del:${item.id}:${page}`).row()
  if (page > 1) keyboard.text('Prev', `c:edit:${page - 1}`)
  if (page < pages) keyboard.text('Next', `c:edit:${page + 1}`)
  if (pages > 1) keyboard.row()
  keyboard.text('Back', 'c:back')
  return respond(ctx, editing, `${prefix}Pilih item yang ingin kakak hapus dari keranjang.\n\nSaat ini fitur edit hanya mendukung hapus item ya kak.`, keyboard)
}

async function showPayment(ctx: Context, user: TelegramCustomer) {
  const preview = await checkoutPreview(user.id)
  return edit(ctx, `Pilih metode pembayaran ya kak.\n\nTotal pembayaran: ${money(preview.total)}${preview.priceChanged ? '\nHarga menu terbaru sudah diterapkan pada total ini.' : ''}\n\nUntuk saat ini metode pembayaran yang tersedia adalah COD.`, new InlineKeyboard().text('COD', 'c:cod').row().text('Back', 'c:back'))
}

async function showOrderList(ctx: Context, user: TelegramCustomer, requestedPage: number, editing: boolean) {
  const limit = positive(await setting('my_orders_page_size', '5')) || 5
  const result = await listCustomerOrders(user.id, requestedPage, limit); const page = Math.min(requestedPage, result.pages)
  if (!result.rows.length) return respond(ctx, editing, 'Kakak belum punya order di Deedims.\n\nKalau mau pesan, silakan kirim /order ya 😊')
  const lines = ['Order kakak di Deedims 📦', '', 'Pilih salah satu order untuk lihat detailnya.', '']
  result.rows.forEach((order, index) => lines.push(`${index + 1}. ${order.orderCode}\n   Status: ${statusLabel(order.orderStatus)}\n   Total: ${money(order.totalAmount)}\n   Dibuat: ${formatJakarta(order.createdAt)}`, ''))
  const keyboard = new InlineKeyboard()
  result.rows.forEach((order, index) => keyboard.text(`${index + 1}. ${order.orderCode}`, `mo:d:${order.id}:${page}`).row())
  if (page > 1) keyboard.text('Prev', `mo:p:${page - 1}`)
  if (page < result.pages) keyboard.text('Next', `mo:p:${page + 1}`)
  if (result.pages > 1) keyboard.row()
  keyboard.text('Refresh', `mo:refresh:${page}`)
  return respond(ctx, editing, lines.join('\n'), keyboard)
}

async function showOrderDetail(ctx: Context, user: TelegramCustomer, orderId: number, page: number, editing: boolean) {
  const order = await customerOrderDetail(user.id, orderId)
  const lines = [`Detail order ${order.orderCode}`, '', `Status: ${statusLabel(order.orderStatus)}`, 'Pembayaran: COD', `Status pembayaran: ${paymentLabel(order.paymentStatus)}`, `Total: ${money(order.totalAmount)}`, `Dibuat: ${formatJakarta(order.createdAt)}`, `Terakhir diperbarui: ${formatJakarta(order.updatedAt)}`]
  if (order.preOrder) lines.push('', 'Pre-order:', order.preOrder.title ?? '', ...(order.preOrder.fulfillmentDate ? [`Jadwal: ${formatJakarta(order.preOrder.fulfillmentDate)}`] : []), ...(order.preOrder.fulfillmentNote ? [`Catatan: ${order.preOrder.fulfillmentNote}`] : []))
  if (order.adminNotes) lines.push('', 'Catatan admin:', order.adminNotes)
  lines.push('', 'Item:')
  order.items.filter((item) => item.parentOrderItemId == null).forEach((item, index) => {
    lines.push(`${index + 1}. ${item.menuNameSnapshot}${item.variantNameSnapshot ? ` (${item.variantNameSnapshot})` : ''} x${item.quantity}`, `   ${money(item.lineTotal)}`)
    for (const addon of order.items.filter((candidate) => candidate.parentOrderItemId === item.id)) lines.push(`   Add-on: ${addon.menuNameSnapshot}${addon.variantNameSnapshot ? ` (${addon.variantNameSnapshot})` : ''} x${addon.quantity} — ${money(addon.lineTotal)}`)
  })
  const keyboard = new InlineKeyboard()
  if (order.orderStatus === 'submitted') keyboard.text('Cancel Order', `mo:cancel:${order.id}:${page}`).row()
  if (order.orderStatus === 'confirmed') keyboard.text('Request Cancel', `mo:request:${order.id}:${page}`).row()
  if (order.orderStatus === 'completed') keyboard.text('Reorder', `mo:reorder:${order.id}:${page}`).row()
  keyboard.text('Back', `mo:p:${page}`).text('Refresh', `mo:d:${order.id}:${page}`)
  return respond(ctx, editing, lines.join('\n'), keyboard)
}

async function guarded(ctx: Context, action: (user: TelegramCustomer) => Promise<unknown>) {
  try {
    if (!ctx.from || !ctx.chat) return
    const user = { id: BigInt(ctx.from.id), username: ctx.from.username, name: fullName(ctx.from) }
    await ensureCustomer(user)
    await action(user)
  } catch (error) {
    const message = error instanceof BotBusinessError ? `Maaf kak, ${error.message}\n\nSilakan coba lagi dari command utama.` : 'Terjadi kendala saat memproses permintaan kak. Silakan coba lagi sebentar lagi ya.'
    if (!(error instanceof BotBusinessError)) console.error(error)
    if (ctx.callbackQuery) await edit(ctx, message).catch(() => reply(ctx, message))
    else await reply(ctx, message)
  }
}

async function reply(ctx: Context, text: string, keyboard?: InlineKeyboard) {
  if (!ctx.chat) return
  return sendTelegramMessage(BigInt(ctx.chat.id), text, { intent: 'bot_reply' }, keyboard ? { reply_markup: keyboard } : undefined)
}

async function edit(ctx: Context, text: string, keyboard?: InlineKeyboard) {
  const message = ctx.callbackQuery?.message
  if (message && 'photo' in message) await ctx.editMessageCaption({ caption: text, ...(keyboard ? { reply_markup: keyboard } : {}) })
  else await ctx.editMessageText(text, keyboard ? { reply_markup: keyboard } : undefined)
  if (!ctx.chat) return
  await logEditedResponse(ctx, text)
}

async function editMenuPhoto(
  ctx: Context,
  menu: { id: number; imageUrl: string | null; telegramFileId: string | null },
  caption: string,
  keyboard: InlineKeyboard,
) {
  const media = menu.telegramFileId || imageInput(menu.imageUrl!)
  try {
    const result = await ctx.editMessageMedia({ type: 'photo', media, caption }, { reply_markup: keyboard })
    if (result !== true && result.photo?.length) {
      const fileId = result.photo[result.photo.length - 1].file_id
      if (fileId !== menu.telegramFileId) await prisma.menu.update({ where: { id: menu.id }, data: { telegramFileId: fileId } })
    }
    await logEditedResponse(ctx, caption)
  } catch (error) {
    if (menu.telegramFileId && menu.imageUrl) {
      await prisma.menu.update({ where: { id: menu.id }, data: { telegramFileId: null } })
      const result = await ctx.editMessageMedia({ type: 'photo', media: imageInput(menu.imageUrl), caption }, { reply_markup: keyboard })
      if (result !== true && result.photo?.length) await prisma.menu.update({ where: { id: menu.id }, data: { telegramFileId: result.photo[result.photo.length - 1].file_id } })
      await logEditedResponse(ctx, caption)
      return
    }
    throw error
  }
}

function imageInput(imageUrl: string) {
  return /^https?:\/\//.test(imageUrl) ? imageUrl : new InputFile(path.resolve(config.uploadsDir, path.basename(imageUrl)))
}

async function respond(ctx: Context, editing: boolean, text: string, keyboard?: InlineKeyboard) {
  return editing ? edit(ctx, text, keyboard) : reply(ctx, text, keyboard)
}

async function logEditedResponse(ctx: Context, text: string) {
  if (!ctx.chat) return
  const customer = ctx.from ? await prisma.customer.findUnique({ where: { telegramUserId: BigInt(ctx.from.id) } }) : null
  await prisma.botMessage.create({ data: { telegramMessageId: ctx.callbackQuery?.message ? BigInt(ctx.callbackQuery.message.message_id) : null, telegramChatId: BigInt(ctx.chat.id), telegramUserId: ctx.from ? BigInt(ctx.from.id) : null, direction: 'outgoing', messageType: 'text', text, telegramUsername: ctx.from?.username ?? null, customerName: ctx.from ? fullName(ctx.from) : null, customerId: customer?.id ?? null, intent: 'bot_edit' } })
}

function fullName(from: { first_name: string; last_name?: string }) { return [from.first_name, from.last_name].filter(Boolean).join(' ') }
function positive(value: string | undefined) { const n = Number(value); return Number.isInteger(n) && n > 0 ? n : 1 }
function money(value: number) { return `Rp${new Intl.NumberFormat('id-ID').format(value)}` }
function statusLabel(status: string) { return ({ submitted: 'Menunggu konfirmasi', confirmed: 'Dikonfirmasi', ready: 'Siap', completed: 'Selesai', cancelled: 'Dibatalkan' } as Record<string, string>)[status] ?? status }
function paymentLabel(status: string) { return ({ pending: 'Belum dibayar', paid: 'Sudah dibayar', cancelled: 'Dibatalkan' } as Record<string, string>)[status] ?? status }
