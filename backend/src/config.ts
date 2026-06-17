import 'dotenv/config'

// BigInt (mis. telegram id) tidak bisa di-serialize JSON secara default →
// jadikan string di seluruh response.
;(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function (this: bigint) {
  return this.toString()
}

/** Konfigurasi terpusat dari environment. Timezone di-set proses-wide agar
 *  cron & format tanggal konsisten Asia/Jakarta, sementara DB tetap UTC. */
export const config = {
  databaseUrl: process.env.DATABASE_URL ?? 'file:./dev.db',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  botToken: process.env.BOT_TOKEN ?? '',
  port: Number(process.env.PORT ?? 3000),
  tz: process.env.TZ ?? 'Asia/Jakarta',
  retentionDays: Number(process.env.RETENTION_DAYS ?? 14),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  uploadsDir: process.env.UPLOADS_DIR ?? './uploads',
  maxUploadBytes: Number(process.env.MAX_UPLOAD_MB ?? 5) * 1024 * 1024,
}

// Pastikan proses berjalan di timezone aplikasi (memengaruhi node-cron).
process.env.TZ = config.tz
