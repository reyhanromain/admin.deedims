import { prisma } from '../db'
import { formatFulfillmentWeek } from '../time'
import { renderTemplate } from './templates'

type SentMessage = { message_id: number; date: number }
type Sender = (chatId: bigint, text: string, options?: Record<string, unknown>) => Promise<SentMessage>

let sender: Sender | null = null

export function registerTelegramSender(next: Sender | null) {
  sender = next
}

export async function sendTelegramMessage(
  chatId: bigint,
  text: string,
  links?: { orderId?: number; preOrderId?: number; intent?: string },
  options?: Record<string, unknown>,
) {
  if (!sender) return null
  const sent = await sender(chatId, text, options)
  const customer = await prisma.customer.findUnique({ where: { telegramUserId: chatId } })
  await prisma.botMessage.create({
    data: {
      telegramMessageId: BigInt(sent.message_id),
      telegramChatId: chatId,
      telegramUserId: chatId,
      direction: 'outgoing',
      messageType: 'text',
      text,
      telegramUsername: customer?.username ?? null,
      customerName: customer?.name ?? null,
      customerId: customer?.id ?? null,
      orderId: links?.orderId,
      preOrderId: links?.preOrderId,
      intent: links?.intent,
      telegramDate: new Date(sent.date * 1000),
    },
  })
  return sent
}

export async function dispatchPreOrderReminders(preOrderId: number) {
  if (!sender) return { sent: 0, failed: 0 }
  const preOrder = await prisma.preOrder.findUniqueOrThrow({ where: { id: preOrderId } })
  const subscribers = await prisma.reminderSubscriber.findMany({ where: { isActive: true } })
  let sentCount = 0
  let failed = 0
  for (const subscriber of subscribers) {
    const existing = await prisma.preOrderReminderLog.findUnique({
      where: { preOrderId_telegramUserId: { preOrderId, telegramUserId: subscriber.telegramUserId } },
    })
    if (existing?.status === 'sent') continue
    try {
      await sendTelegramMessage(subscriber.telegramUserId, await reminderText(preOrder), { preOrderId, intent: 'preorder_reminder' })
      await prisma.preOrderReminderLog.upsert({
        where: { preOrderId_telegramUserId: { preOrderId, telegramUserId: subscriber.telegramUserId } },
        create: { preOrderId, telegramUserId: subscriber.telegramUserId, status: 'sent' },
        update: { status: 'sent', errorMessage: null, sentAt: new Date() },
      })
      sentCount++
    } catch (error) {
      await prisma.preOrderReminderLog.upsert({
        where: { preOrderId_telegramUserId: { preOrderId, telegramUserId: subscriber.telegramUserId } },
        create: { preOrderId, telegramUserId: subscriber.telegramUserId, status: 'failed', errorMessage: errorMessage(error) },
        update: { status: 'failed', errorMessage: errorMessage(error), sentAt: new Date() },
      })
      failed++
    }
  }
  return { sent: sentCount, failed }
}

export async function notifyOrderStatus(orderId: number, event: 'status' | 'cancel_approved' | 'cancel_rejected') {
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order?.telegramUserId || !sender) return null
  const text = event === 'cancel_approved'
    ? await renderTemplate('order_cancel_approved_notification', { order_code: order.orderCode, order_status: orderStatusLabel(order.orderStatus) })
    : event === 'cancel_rejected'
      ? await renderTemplate('order_cancel_rejected_notification', { order_code: order.orderCode })
      : await renderTemplate('order_status_notification', { order_code: order.orderCode, order_status: orderStatusLabel(order.orderStatus) })
  return sendTelegramMessage(order.telegramUserId, text, { orderId, intent: `order_${event}` })
}

async function reminderText(preOrder: { title: string | null; description: string | null; fulfillmentStartDate: Date | null; fulfillmentEndDate: Date | null; fulfillmentNote: string | null }) {
  const fulfillmentWeek = formatFulfillmentWeek(preOrder.fulfillmentStartDate, preOrder.fulfillmentEndDate)
  return renderTemplate('preorder_reminder_notification', {
    preorder_title: preOrder.title ?? '',
    preorder_description: preOrder.description ?? '',
    fulfillment_week: fulfillmentWeek ?? '',
    fulfillment_note: preOrder.fulfillmentNote ?? '',
  })
}

function orderStatusLabel(status: string) {
  return ({ submitted: 'Menunggu konfirmasi', confirmed: 'Dikonfirmasi', ready: 'Siap', completed: 'Selesai', cancelled: 'Dibatalkan' } as Record<string, string>)[status] ?? status
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500)
}
