import path from 'node:path'
import { Bot, Context, InlineKeyboard, InputFile, type Context as GrammyContext } from 'grammy'
import { prisma } from '../db'
import { config } from '../config'
import { formatFulfillmentWeek, formatJakarta } from '../time'
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
  listAutomaticFreeAddonVariants,
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
import { renderTemplate, type TemplateKey } from './templates'

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
  const text = ctx.message?.text ?? ctx.message?.caption ?? callbackButtonLabel(ctx) ?? ctx.callbackQuery?.data ?? null
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

function callbackButtonLabel(ctx: GrammyContext) {
  const callbackData = ctx.callbackQuery?.data
  const message = ctx.callbackQuery?.message
  if (!callbackData || !message || !('reply_markup' in message) || !message.reply_markup) return null
  for (const row of message.reply_markup.inline_keyboard) for (const button of row) {
    if ('callback_data' in button && button.callback_data === callbackData) return button.text
  }
  return null
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

  bot.on('message:entities:bot_command', async (ctx, next) => {
    await cancelActiveOrderMessage(ctx)
    await next()
  })

  bot.command('start', async (ctx) => {
    return guarded(ctx, async (user) => {
      const intro = await setting('start_quick_intro', 'Halo kak 👋\nSelamat datang di Deedims.')
      const { preOrder, menus } = await listOrderableMenus()
      if (!preOrder) return replyTemplate(ctx, 'start_closed', { intro })
      if (!menus.length) return replyTemplate(ctx, 'start_empty_menu', { intro })
      const fulfillmentWeek = formatFulfillmentWeek(preOrder.fulfillmentStartDate, preOrder.fulfillmentEndDate)
      return replyTemplate(ctx, 'start_open', {
        intro,
        preorder_title: preOrder.title ?? '',
        preorder_description: preOrder.description ?? '',
        fulfillment_week: fulfillmentWeek ?? '',
        fulfillment_note: preOrder.fulfillmentNote ?? '',
      })
    })
  })

  bot.command('remind_preorder', async (ctx) => guarded(ctx, async (user) => {
    const result = await subscribeReminder(user)
    return replyTemplate(ctx, result.alreadyActive ? 'reminder_already_subscribed' : 'reminder_subscribed')
  }))

  bot.command('stop_preorder_reminder', async (ctx) => guarded(ctx, async (user) => {
    const result = await unsubscribeReminder(user.id)
    return replyTemplate(ctx, result.wasActive ? 'reminder_unsubscribed' : 'reminder_not_subscribed')
  }))

  bot.command('order', async (ctx) => {
    return guarded(ctx, async (user) => showMenuList(ctx, user, 1, false))
  })
  bot.command('carts', async (ctx) => {
    return guarded(ctx, async (user) => showCart(ctx, user, false))
  })
  bot.command('my_orders', async (ctx) => {
    return guarded(ctx, async (user) => showOrderList(ctx, user, 1, false))
  })

  bot.on('callback_query:data', async (ctx) => guarded(ctx, async (user) => {
    await ctx.answerCallbackQuery().catch(() => undefined)
    await handleCallback(ctx, user, ctx.callbackQuery.data)
  }))

  bot.on('message', (ctx) => replyTemplate(ctx, 'unknown_message'))
  bot.catch((error) => console.error('Bot handler error:', error.error))
  return bot
}

async function handleCallback(ctx: Context, user: TelegramCustomer, data: string) {
  const p = data.split(':')
  if (p[0] === 'o') {
    const customer = await prisma.customer.findUnique({ where: { telegramUserId: user.id }, select: { activeOrderMessageId: true } })
    const callbackMessageId = ctx.callbackQuery?.message?.message_id
    if (!callbackMessageId || customer?.activeOrderMessageId !== BigInt(callbackMessageId)) return
    if (p[1] === 'p') return showMenuList(ctx, user, positive(p[2]), true)
    if (p[1] === 'm') return showMenu(ctx, user, positive(p[2]), positive(p[3]), true)
    if (p[1] === 'v') return showQuantity(ctx, user, positive(p[2]), positive(p[3]))
    if (p[1] === 'q') return showAddons(ctx, user, positive(p[2]), positive(p[3]), positive(p[4]))
    if (p[1] === 'cf') return showAddConfirmation(ctx, positive(p[2]), positive(p[3]), Number(p[4]), positive(p[5]))
    if (p[1] === 'add') {
      await addToCart({ telegramUserId: user.id, variantId: positive(p[2]), quantity: positive(p[3]), addonVariantId: Number(p[4]) || undefined })
      await editTemplate(ctx, 'add_to_cart_success')
      await clearActiveOrderMessage(user.id)
      return
    }
    if (p[1] === 'cancel') return editTemplate(ctx, 'order_flow_cancel_confirm', {}, new InlineKeyboard().text('Yes, cancel order', 'o:cancel_yes').row().text('Back', 'o:p:1'))
    if (p[1] === 'cancel_yes') {
      await clearCart(user.id)
      await editTemplate(ctx, 'order_cancelled')
      await clearActiveOrderMessage(user.id)
      return
    }
  }
  if (p[0] === 'c') {
    if (p[1] === 'back') return showCart(ctx, user, true)
    if (p[1] === 'empty') return editTemplate(ctx, 'cart_empty_confirm', {}, new InlineKeyboard().text('Yes, empty cart', 'c:empty_yes').row().text('Back', 'c:back'))
    if (p[1] === 'empty_yes') { await clearCart(user.id); return editTemplate(ctx, 'cart_emptied') }
    if (p[1] === 'edit') return showCartEditor(ctx, user, positive(p[2]), true)
    if (p[1] === 'del') { await deleteCartItem(user.id, positive(p[2])); return showCartEditor(ctx, user, positive(p[3]), true, await renderTemplate('cart_item_deleted_prefix')) }
    if (p[1] === 'checkout') return showPayment(ctx, user)
    if (p[1] === 'cod') {
      const order = await checkout(user)
      return editTemplate(ctx, 'checkout_success', { order_code: order.orderCode, total: money(order.totalAmount) })
    }
  }
  if (p[0] === 'mo') {
    if (p[1] === 'p' || p[1] === 'refresh') return showOrderList(ctx, user, positive(p[2]), true)
    if (p[1] === 'd') return showOrderDetail(ctx, user, positive(p[2]), positive(p[3]), true)
    if (p[1] === 'cancel') return editTemplate(ctx, 'order_cancel_confirm', {}, new InlineKeyboard().text('Yes, cancel order', `mo:cancel_yes:${p[2]}:${p[3]}`).row().text('Back', `mo:d:${p[2]}:${p[3]}`))
    if (p[1] === 'cancel_yes') { const order = await cancelSubmittedOrder(user.id, positive(p[2])); return editTemplate(ctx, 'order_cancel_success', { order_code: order.orderCode }) }
    if (p[1] === 'request') { const result = await requestOrderCancellation(user.id, positive(p[2])); return editTemplate(ctx, result.alreadyRequested ? 'order_cancel_request_exists' : 'order_cancel_request_sent') }
    if (p[1] === 'reorder') {
      const result = await reorderCompleted(user.id, positive(p[2]))
      const notes = [
        result.filtered ? await renderTemplate('reorder_filtered_note') : null,
        result.priceChanged ? await renderTemplate('reorder_price_changed_note') : null,
      ].filter((note): note is string => Boolean(note))
      const noteBlock = notes.length ? `\n\n${await renderTemplate('reorder_note_header')}\n- ${notes.join('\n- ')}` : ''
      return editTemplate(ctx, 'reorder_success', { notes: noteBlock })
    }
  }
  return editTemplate(ctx, 'stale_choice')
}

async function showMenuList(ctx: Context, user: TelegramCustomer, requestedPage: number, editing: boolean) {
  const { preOrder, menus } = await listOrderableMenus()
  if (!preOrder) return respondTemplate(ctx, editing, 'order_closed')
  if (!menus.length) return respondTemplate(ctx, editing, 'order_no_menu')
  const size = positive(await setting('order_menu_page_size', '8')) || 8
  const pages = Math.max(1, Math.ceil(menus.length / size))
  const page = Math.min(requestedPage, pages)
  const keyboard = new InlineKeyboard()
  for (const menu of menus.slice((page - 1) * size, page * size)) keyboard.text(`${menu.name}${menu.isAddon ? ' (Addon)' : ''}`, `o:m:${menu.id}:${page}`).row()
  if (pages > 1) {
    if (page > 1) keyboard.text('Prev', `o:p:${page - 1}`)
    if (page < pages) keyboard.text('Next', `o:p:${page + 1}`)
    keyboard.row()
  }
  keyboard.text('Cancel', 'o:cancel')
  if (editing) return editTemplate(ctx, 'order_menu_list', {}, keyboard)
  const sent = await replyTemplate(ctx, 'order_menu_list', {}, keyboard)
  if (sent) await prisma.customer.update({ where: { telegramUserId: user.id }, data: { activeOrderMessageId: BigInt(sent.message_id) } })
  return sent
}

async function showMenu(ctx: Context, _user: TelegramCustomer, menuId: number, page: number, editing: boolean) {
  if (!await openPreOrder()) throw new BotBusinessError('PREORDER_CLOSED', 'Pre-order sudah tidak dibuka.')
  const menu = await prisma.menu.findFirst({ where: { id: menuId, isActive: true }, include: { variants: { where: { isActive: true }, orderBy: { id: 'asc' } } } })
  if (!menu?.variants.length) throw new BotBusinessError('MENU_INVALID', 'Menu ini sudah tidak bisa dipesan.')
  const keyboard = new InlineKeyboard()
  for (const variant of menu.variants) keyboard.text(`${visibleVariantName(variant.name) ?? 'Add to cart'} - ${money(variant.price)}`, `o:v:${variant.id}:${page}`).row()
  keyboard.text('Back to menu', `o:p:${page}`).row().text('Cancel', 'o:cancel')
  const text = await renderTemplate('menu_detail', {
    menu_name: menu.name,
    menu_description: menu.description ?? '',
    prompt: await renderTemplate(menu.variants.length > 1 ? 'menu_detail_variant_prompt' : 'menu_detail_add_prompt'),
  })
  if (editing && (menu.telegramFileId || menu.imageUrl)) return editMenuPhoto(ctx, menu, text, keyboard)
  return respond(ctx, editing, text, keyboard)
}

async function showQuantity(ctx: Context, user: TelegramCustomer, variantId: number, page: number) {
  const capacity = await maxAddableQuantity(user.id, variantId)
  if (!capacity) throw new BotBusinessError('STOCK_INSUFFICIENT', 'Stock untuk menu ini sudah habis atau tidak cukup.')
  const variant = await prisma.menuVariant.findUniqueOrThrow({ where: { id: variantId }, include: { menu: true, stockUsages: { include: { stockItem: true } } } })
  const keyboard = new InlineKeyboard()
  const unitLabel = variant.menu.unitLabel?.trim()
  for (let qty = 1; qty <= Math.min(3, capacity); qty++) keyboard.text(`Add ${qty}${unitLabel ? ` ${unitLabel}` : ''}`, `o:q:${variantId}:${qty}:${page}`).row()
  keyboard.text('Back', `o:m:${variant.menuId}:${page}`).row().text('Cancel', 'o:cancel')
  const contents = variant.stockUsages.map((usage) => `${usage.quantity}${usage.stockItem.unit ? ` ${usage.stockItem.unit}` : ''} ${usage.stockItem.name}`)
  const contentBlock = contents.length === 1
    ? await renderTemplate('variant_quantity_single_content', { content: contents[0] })
    : contents.length > 1
      ? await renderTemplate('variant_quantity_multi_content', { contents: contents.map((item) => `- ${item}`).join('\n') })
      : ''
  const caption = await renderTemplate('variant_quantity_prompt', {
    menu_name: variant.menu.name,
    variant_line: visibleVariantName(variant.name) ? await renderTemplate('variant_quantity_variant_line', { variant_name: variant.name }) : '',
    content_block: contentBlock,
    price: money(variant.price),
  })
  const imageUrl = variant.imageUrl ?? variant.menu.imageUrl
  if (imageUrl) return editMenuPhoto(ctx, { id: variant.menuId, imageUrl, telegramFileId: null }, caption, keyboard)
  return edit(ctx, caption, keyboard)
}

async function showAddons(ctx: Context, _user: TelegramCustomer, variantId: number, qty: number, page: number) {
  const variant = await prisma.menuVariant.findUniqueOrThrow({ where: { id: variantId }, include: { menu: true } })
  const freeAddons = await listAutomaticFreeAddonVariants(variant.menuId)
  const links = await prisma.menuAddon.findMany({ where: { menuId: variant.menuId, isActive: true, isFree: false }, include: { addonMenu: { include: { variants: { where: { isActive: true }, orderBy: { id: 'asc' } } } } }, orderBy: { sortOrder: 'asc' } })
  const valid = links.filter((link) => link.addonMenu.isActive && link.addonMenu.variants.length)
  if (!valid.length) return showAddConfirmation(ctx, variantId, qty, 0, page)
  const keyboard = new InlineKeyboard()
  const options = new Map<number, { link: typeof valid[number]; variant: typeof valid[number]['addonMenu']['variants'][number] }>()
  for (const link of valid) for (const addonVariant of link.addonMenu.variants) options.set(addonVariant.id, { link, variant: addonVariant })
  for (const { link, variant: addonVariant } of options.values()) keyboard.text(`${link.addonMenu.name}${visibleVariantName(addonVariant.name) ? ` ${addonVariant.name}` : ''} - ${money(addonVariant.price)}`, `o:cf:${variantId}:${qty}:${addonVariant.id}:${page}`).row()
  keyboard.text('Skip add-on', `o:cf:${variantId}:${qty}:0:${page}`).row().text('Back to menu', `o:p:${page}`).row().text('Cancel', 'o:cancel')
  const selection = [`- ${variant.menu.name} x${qty}`, ...freeAddons.map((addon) => `- ${addon.menu.name} x${qty} (Free)`)]
  return editTemplate(ctx, 'addon_prompt', { selection: selection.join('\n') }, keyboard)
}

async function showAddConfirmation(ctx: Context, variantId: number, qty: number, addonVariantId: number, page: number) {
  const variant = await prisma.menuVariant.findUniqueOrThrow({ where: { id: variantId }, include: { menu: true } })
  const freeAddons = await listAutomaticFreeAddonVariants(variant.menuId)
  const addon = addonVariantId ? await prisma.menuVariant.findUnique({ where: { id: addonVariantId }, include: { menu: true } }) : null
  const freeLines = freeAddons.map((item) => `${item.menu.name}${visibleVariantName(item.name) ? ` (${item.name})` : ''} x${qty} (Free)`)
  const selection = [`${variant.menu.name}${visibleVariantName(variant.name) ? ` (${variant.name})` : ''} x${qty}`, ...freeLines, addon ? `Add-on: ${addon.menu.name}${visibleVariantName(addon.name) ? ` (${addon.name})` : ''} x${qty}` : 'Tanpa add-on berbayar'].join('\n')
  const text = await renderTemplate('add_confirmation', { selection })
  const keyboard = new InlineKeyboard().text('Add to cart', `o:add:${variantId}:${qty}:${addonVariantId}:${page}`).row().text('Choose different add-on', `o:q:${variantId}:${qty}:${page}`).row().text('Back to menu', `o:p:${page}`).row().text('Cancel', 'o:cancel')
  return edit(ctx, text, keyboard)
}

async function showCart(ctx: Context, user: TelegramCustomer, editing: boolean) {
  const cart = await getCart(user.id)
  if (!cart.main.length) return respondTemplate(ctx, editing, 'cart_empty')
  const itemLines: string[] = []
  for (const [index, item] of cart.main.entries()) {
    itemLines.push(await renderTemplate('cart_item_line', {
      number: index + 1,
      menu_name: item.menuNameSnapshot,
      variant_name: item.variantNameSnapshot ? ` (${item.variantNameSnapshot})` : '',
      quantity: item.quantity,
      line_total: money(item.unitPrice * item.quantity),
    }))
    for (const addon of item.addons) itemLines.push(await renderTemplate('cart_addon_line', {
      menu_name: addon.menuNameSnapshot,
      variant_name: addon.variantNameSnapshot ? ` (${addon.variantNameSnapshot})` : '',
      quantity: addon.quantity,
      line_total: money(addon.unitPrice * addon.quantity),
    }))
  }
  const stockLines = cart.stock.map((stock) => `- ${stock.name}: ${stock.required} ${stock.unit ?? ''} / tersedia ${stock.available} ${stock.unit ?? ''}`).join('\n')
  const text = await renderTemplate('cart_summary', {
    items: itemLines.join('\n'),
    total: money(cart.total),
    stock_lines: stockLines,
    stock_status: await renderTemplate(cart.stockSufficient ? 'cart_stock_status_sufficient' : 'cart_stock_status_insufficient'),
  })
  const keyboard = new InlineKeyboard()
  if (cart.stockSufficient) keyboard.text('Check out', 'c:checkout').row()
  else keyboard.text('Edit Cart', 'c:edit:1').row()
  keyboard.text('Empty cart', 'c:empty')
  return respond(ctx, editing, text, keyboard)
}

async function showCartEditor(ctx: Context, user: TelegramCustomer, requestedPage: number, editing: boolean, prefix = '') {
  const cart = await getCart(user.id)
  if (!cart.main.length) return respondTemplate(ctx, editing, 'cart_empty_after_delete', { prefix })
  const size = positive(await setting('cart_edit_page_size', '8')) || 8
  const pages = Math.max(1, Math.ceil(cart.main.length / size)); const page = Math.min(requestedPage, pages)
  const keyboard = new InlineKeyboard()
  for (const [index, item] of cart.main.slice((page - 1) * size, page * size).entries()) keyboard.text(`${(page - 1) * size + index + 1}. ${item.menuNameSnapshot} x${item.quantity}`, `c:del:${item.id}:${page}`).row()
  if (page > 1) keyboard.text('Prev', `c:edit:${page - 1}`)
  if (page < pages) keyboard.text('Next', `c:edit:${page + 1}`)
  if (pages > 1) keyboard.row()
  keyboard.text('Back', 'c:back')
  return respondTemplate(ctx, editing, 'cart_edit_prompt', { prefix }, keyboard)
}

async function showPayment(ctx: Context, user: TelegramCustomer) {
  const preview = await checkoutPreview(user.id)
  return editTemplate(ctx, 'payment_prompt', { total: money(preview.total), price_changed_note: preview.priceChanged ? await renderTemplate('payment_price_changed_note') : '' }, new InlineKeyboard().text('COD', 'c:cod').row().text('Back', 'c:back'))
}

async function showOrderList(ctx: Context, user: TelegramCustomer, requestedPage: number, editing: boolean) {
  const limit = positive(await setting('my_orders_page_size', '5')) || 5
  const result = await listCustomerOrders(user.id, requestedPage, limit); const page = Math.min(requestedPage, result.pages)
  if (!result.rows.length) return respondTemplate(ctx, editing, 'my_orders_empty')
  const header = await renderTemplate('my_orders_list_header')
  const lines = [header, '']
  for (const [index, order] of result.rows.entries()) lines.push(await renderTemplate('my_orders_list_row', {
    number: index + 1,
    order_code: order.orderCode,
    order_status: statusLabel(order.orderStatus),
    total: money(order.totalAmount),
    created_at: formatJakarta(order.createdAt),
  }), '')
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
  const lines = [await renderTemplate('order_detail_header', {
    order_code: order.orderCode,
    order_status: statusLabel(order.orderStatus),
    payment_method: 'COD',
    payment_status: paymentLabel(order.paymentStatus),
    total: money(order.totalAmount),
    created_at: formatJakarta(order.createdAt),
    updated_at: formatJakarta(order.updatedAt),
  })]
  if (order.preOrder) {
    const fulfillmentWeek = formatFulfillmentWeek(order.preOrder.fulfillmentStartDate, order.preOrder.fulfillmentEndDate)
    lines.push('', await renderTemplate('order_detail_preorder', {
      preorder_title: order.preOrder.title ?? '',
      fulfillment_week: fulfillmentWeek ?? '',
      fulfillment_note: order.preOrder.fulfillmentNote ?? '',
    }))
  }
  if (order.adminNotes) lines.push('', await renderTemplate('order_detail_admin_notes', { admin_notes: order.adminNotes }))
  lines.push('', await renderTemplate('order_detail_items_header'))
  for (const [index, item] of order.items.filter((item) => item.parentOrderItemId == null).entries()) {
    lines.push(await renderTemplate('order_detail_item_line', {
      number: index + 1,
      menu_name: item.menuNameSnapshot,
      variant_name: item.variantNameSnapshot ? ` (${item.variantNameSnapshot})` : '',
      quantity: item.quantity,
      line_total: money(item.lineTotal),
    }))
    for (const addon of order.items.filter((candidate) => candidate.parentOrderItemId === item.id)) lines.push(await renderTemplate('order_detail_addon_line', {
      menu_name: addon.menuNameSnapshot,
      variant_name: addon.variantNameSnapshot ? ` (${addon.variantNameSnapshot})` : '',
      quantity: addon.quantity,
      line_total: money(addon.lineTotal),
    }))
  }
  const keyboard = new InlineKeyboard()
  if (order.orderStatus === 'submitted') keyboard.text('Cancel Order', `mo:cancel:${order.id}:${page}`).row()
  if (order.orderStatus === 'confirmed') keyboard.text('Request Cancel', `mo:request:${order.id}:${page}`).row()
  if (order.orderStatus === 'completed') keyboard.text('Reorder', `mo:reorder:${order.id}:${page}`).row()
  keyboard.text('Back', `mo:p:${page}`).text('Refresh', `mo:d:${order.id}:${page}`)
  return respond(ctx, editing, lines.join('\n'), keyboard)
}

async function cancelActiveOrderMessage(ctx: Context) {
  if (!ctx.chat || !ctx.from) return
  const telegramUserId = BigInt(ctx.from.id)
  const customer = await prisma.customer.findUnique({ where: { telegramUserId }, select: { activeOrderMessageId: true } })
  if (!customer?.activeOrderMessageId) return
  const messageId = Number(customer.activeOrderMessageId)
  try {
    await ctx.api.deleteMessage(ctx.chat.id, messageId)
  } catch {
    const options = { parse_mode: 'HTML' as const, reply_markup: { inline_keyboard: [] } }
    try {
      await ctx.api.editMessageText(ctx.chat.id, messageId, '<i>Pesan ini dibatalkan</i>', options)
    } catch {
      await ctx.api.editMessageCaption(ctx.chat.id, messageId, { caption: '<i>Pesan ini dibatalkan</i>', ...options }).catch(() => undefined)
    }
  } finally {
    await clearActiveOrderMessage(telegramUserId)
  }
}

async function clearActiveOrderMessage(telegramUserId: bigint) {
  await prisma.customer.updateMany({ where: { telegramUserId }, data: { activeOrderMessageId: null } })
}

async function guarded(ctx: Context, action: (user: TelegramCustomer) => Promise<unknown>) {
  try {
    if (!ctx.from || !ctx.chat) return
    const user = { id: BigInt(ctx.from.id), username: ctx.from.username, name: fullName(ctx.from) }
    await ensureCustomer(user)
    await action(user)
  } catch (error) {
    const message = error instanceof BotBusinessError ? await renderTemplate('business_error', { error_message: error.message }) : await renderTemplate('system_error')
    if (!(error instanceof BotBusinessError)) console.error(error)
    if (ctx.callbackQuery) await edit(ctx, message).catch(() => reply(ctx, message))
    else await reply(ctx, message)
  }
}

async function replyTemplate(ctx: Context, key: TemplateKey, values: Record<string, unknown> = {}, keyboard?: InlineKeyboard) {
  return reply(ctx, await renderTemplate(key, values), keyboard)
}

async function editTemplate(ctx: Context, key: TemplateKey, values: Record<string, unknown> = {}, keyboard?: InlineKeyboard) {
  return edit(ctx, await renderTemplate(key, values), keyboard)
}

async function respondTemplate(ctx: Context, editing: boolean, key: TemplateKey, values: Record<string, unknown> = {}, keyboard?: InlineKeyboard) {
  return respond(ctx, editing, await renderTemplate(key, values), keyboard)
}

async function reply(ctx: Context, text: string, keyboard?: InlineKeyboard) {
  if (!ctx.chat) return
  const sent = await sendTelegramMessage(BigInt(ctx.chat.id), text, { intent: 'bot_reply' }, { parse_mode: 'HTML', ...(keyboard ? { reply_markup: keyboard } : {}) })
  if (sent && keyboard && ctx.from) await prisma.customer.updateMany({ where: { telegramUserId: BigInt(ctx.from.id) }, data: { activeOrderMessageId: BigInt(sent.message_id) } })
  return sent
}

async function edit(ctx: Context, text: string, keyboard?: InlineKeyboard) {
  const message = ctx.callbackQuery?.message
  if (message && 'photo' in message) await ctx.editMessageCaption({ caption: text, parse_mode: 'HTML', ...(keyboard ? { reply_markup: keyboard } : {}) })
  else await ctx.editMessageText(text, { parse_mode: 'HTML', ...(keyboard ? { reply_markup: keyboard } : {}) })
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
    const result = await ctx.editMessageMedia({ type: 'photo', media, caption, parse_mode: 'HTML' }, { reply_markup: keyboard })
    if (result !== true && result.photo?.length) {
      const fileId = result.photo[result.photo.length - 1].file_id
      if (fileId !== menu.telegramFileId) await prisma.menu.update({ where: { id: menu.id }, data: { telegramFileId: fileId } })
    }
    await logEditedResponse(ctx, caption)
  } catch (error) {
    if (menu.telegramFileId && menu.imageUrl) {
      await prisma.menu.update({ where: { id: menu.id }, data: { telegramFileId: null } })
      const result = await ctx.editMessageMedia({ type: 'photo', media: imageInput(menu.imageUrl), caption, parse_mode: 'HTML' }, { reply_markup: keyboard })
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
