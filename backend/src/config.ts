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
  miniAppUrl: process.env.MINI_APP_URL ?? '',
  port: Number(process.env.PORT ?? 3000),
  tz: process.env.TZ ?? 'Asia/Jakarta',
  retentionDays: Number(process.env.RETENTION_DAYS ?? 14),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  uploadsDir: process.env.UPLOADS_DIR ?? './uploads',
  maxUploadBytes: Number(process.env.MAX_UPLOAD_MB ?? 5) * 1024 * 1024,
  // Throttle endpoint publik tanpa auth. Login dihitung per KEGAGALAN (sukses
  // mereset), mini app auth dihitung per request karena ancamannya DoS.
  loginRateMax: Number(process.env.LOGIN_RATE_MAX ?? 5),
  loginRateIpMax: Number(process.env.LOGIN_RATE_IP_MAX ?? 20),
  loginRateWindowMs: Number(process.env.LOGIN_RATE_WINDOW_MIN ?? 15) * 60 * 1000,
  miniappAuthRateMax: Number(process.env.MINIAPP_AUTH_RATE_MAX ?? 30),
  miniappAuthRateWindowMs: Number(process.env.MINIAPP_AUTH_RATE_WINDOW_MIN ?? 15) * 60 * 1000,
}

// Pastikan proses berjalan di timezone aplikasi (memengaruhi node-cron).
process.env.TZ = config.tz
