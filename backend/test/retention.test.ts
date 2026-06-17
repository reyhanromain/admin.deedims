import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { resetDb, prisma } from './helpers'
import { purgeOldBotMessages } from '../src/jobs/retention'

beforeAll(resetDb)
afterAll(async () => { await prisma.$disconnect() })
beforeEach(async () => { await prisma.botMessage.deleteMany() })

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000)

describe('retention purge (cap 14 hari)', () => {
  it('menghapus pesan > 14 hari, menyisakan yang baru', async () => {
    await prisma.botMessage.create({ data: { telegramChatId: 1n, direction: 'incoming', messageType: 'text', text: 'lama', receivedAt: daysAgo(20) } })
    await prisma.botMessage.create({ data: { telegramChatId: 1n, direction: 'incoming', messageType: 'text', text: 'baru', receivedAt: daysAgo(1) } })

    const deleted = await purgeOldBotMessages()
    expect(deleted).toBe(1)

    const sisa = await prisma.botMessage.findMany()
    expect(sisa).toHaveLength(1)
    expect(sisa[0].text).toBe('baru')
  })

  it('tepat di batas (< 14 hari) tetap disimpan', async () => {
    await prisma.botMessage.create({ data: { telegramChatId: 1n, direction: 'incoming', messageType: 'text', receivedAt: daysAgo(13) } })
    const deleted = await purgeOldBotMessages()
    expect(deleted).toBe(0)
  })
})
