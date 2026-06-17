import cron from 'node-cron'
import { prisma } from '../db'
import { config } from '../config'
import { APP_TZ, retentionCutoff } from '../time'

/** Hapus bot_messages lebih tua dari RETENTION_DAYS. Aman dipanggil manual juga. */
export async function purgeOldBotMessages(now: Date = new Date()) {
  const cutoff = retentionCutoff(config.retentionDays, now)
  const { count } = await prisma.botMessage.deleteMany({
    where: { receivedAt: { lt: cutoff } },
  })
  if (count > 0) {
    console.log(`[retention] hapus ${count} bot_messages < ${cutoff.toISOString()} (UTC)`)
  }
  return count
}

/**
 * Jadwalkan retensi harian: 00:00 waktu Asia/Jakarta.
 * Hard cap — tidak ada baris yang melewati RETENTION_DAYS hari.
 */
export function startRetentionJob() {
  cron.schedule('0 0 * * *', () => void purgeOldBotMessages(), { timezone: APP_TZ })
  console.log(`[retention] aktif: harian 00:00 ${APP_TZ}, cap ${config.retentionDays} hari`)
}
