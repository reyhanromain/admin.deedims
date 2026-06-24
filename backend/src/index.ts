import { config } from './config'
import { buildServer } from './server'
import { createBot } from './bot'
import { startRetentionJob } from './jobs/retention'
import { prisma } from './db'

async function main() {
  const app = await buildServer()

  // API HTTP
  await app.listen({ port: config.port, host: '0.0.0.0' })
  app.log.info(`API siap di :${config.port} (TZ=${config.tz})`)

  // Cron retensi bot_messages
  startRetentionJob()

  // Bot Telegram (kalau token ada)
  const bot = createBot()
  if (bot) {
    void bot.start({
      onStart: async (info) => {
        await bot.api.deleteWebhook({ drop_pending_updates: false })
        await bot.api.setMyCommands([
          { command: 'start', description: 'Cek status pre-order' },
          { command: 'order', description: 'Pilih menu dan mulai pesan' },
          { command: 'carts', description: 'Lihat keranjang dan checkout' },
          { command: 'my_orders', description: 'Lihat status dan histori order' },
          { command: 'remind_preorder', description: 'Aktifkan reminder pre-order' },
          { command: 'stop_preorder_reminder', description: 'Matikan reminder pre-order' },
        ])
        // Menu Button persisten yang membuka mini app (kalau MINI_APP_URL di-set).
        if (config.miniAppUrl) {
          await bot.api.setChatMenuButton({
            menu_button: { type: 'web_app', text: 'Buka Mini App', web_app: { url: config.miniAppUrl } },
          }).catch((error) => app.log.warn(error, 'Gagal set menu button mini app'))
        }
        app.log.info(`Bot @${info.username} aktif`)
      },
    }).catch((error) => app.log.error(error, 'Bot Telegram gagal dijalankan'))
  } else {
    app.log.warn('BOT_TOKEN kosong — bot tidak dijalankan (mode API-only)')
  }

  // Shutdown rapi
  const shutdown = async () => {
    app.log.info('Shutting down...')
    if (bot) await bot.stop()
    await app.close()
    await prisma.$disconnect()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
