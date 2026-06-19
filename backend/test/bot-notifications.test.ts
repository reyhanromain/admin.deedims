import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma, resetDb } from './helpers'
import { dispatchPreOrderReminders, notifyOrderStatus, registerTelegramSender } from '../src/bot/notifications'

beforeEach(resetDb)
afterEach(() => registerTelegramSender(null))

describe('bot notifications', () => {
  it('mengirim reminder sekali per subscriber/pre-order dan mencatat outgoing', async () => {
    const sender = vi.fn(async () => ({ message_id: 90, date: Math.floor(Date.now() / 1000) }))
    registerTelegramSender(sender)

    expect(await dispatchPreOrderReminders(1)).toEqual({ sent: 1, failed: 0 })
    expect(await dispatchPreOrderReminders(1)).toEqual({ sent: 0, failed: 0 })
    expect(sender).toHaveBeenCalledTimes(1)
    expect(await prisma.preOrderReminderLog.count({ where: { preOrderId: 1, status: 'sent' } })).toBe(1)
    expect(await prisma.botMessage.findFirst({ where: { direction: 'outgoing', preOrderId: 1 } })).toMatchObject({ intent: 'preorder_reminder' })
  })

  it('mencatat kegagalan reminder agar dapat dicoba ulang', async () => {
    registerTelegramSender(vi.fn().mockRejectedValueOnce(new Error('Telegram unavailable')).mockResolvedValueOnce({ message_id: 91, date: Math.floor(Date.now() / 1000) }))
    expect(await dispatchPreOrderReminders(1)).toEqual({ sent: 0, failed: 1 })
    expect(await prisma.preOrderReminderLog.findFirstOrThrow()).toMatchObject({ status: 'failed', errorMessage: 'Telegram unavailable' })
    expect(await dispatchPreOrderReminders(1)).toEqual({ sent: 1, failed: 0 })
    expect(await prisma.preOrderReminderLog.findFirstOrThrow()).toMatchObject({ status: 'sent', errorMessage: null })
  })

  it('mengirim notifikasi perubahan status order', async () => {
    const sender = vi.fn(async () => ({ message_id: 92, date: Math.floor(Date.now() / 1000) }))
    registerTelegramSender(sender)
    await prisma.order.update({ where: { id: 1 }, data: { orderStatus: 'ready' } })
    await notifyOrderStatus(1, 'status')
    expect(String(sender.mock.calls[0][1])).toContain('Siap')
    expect(await prisma.botMessage.findFirst({ where: { orderId: 1, direction: 'outgoing' } })).toMatchObject({ intent: 'order_status' })
  })
})
