import type { FastifyRequest } from 'fastify'

/**
 * IP klien sebenarnya di balik rantai Cloudflare → cloudflared → nginx → backend.
 *
 * `req.ip` TIDAK bisa dipakai di sini: Fastify dibuat tanpa `trustProxy`, jadi
 * nilainya adalah alamat container nginx — sama untuk setiap klien di dunia.
 * Throttle yang di-key ke sana akan menaruh semua orang dalam satu ember.
 *
 * `X-Real-IP` juga tidak berguna: nginx mengisinya dengan `$remote_addr`, yang
 * di sini adalah container cloudflared, bukan browser.
 *
 * `CF-Connecting-IP` diisi dan ditimpa Cloudflare di edge sehingga tidak bisa
 * dipalsukan dari luar; itu sebabnya ia didahulukan. Fallback X-Forwarded-For
 * (entri paling kiri = klien asli) hanya aman selama origin tak bisa dihubungi
 * langsung — port backend di-bind ke 127.0.0.1 dan satu-satunya ingress adalah
 * tunnel. `req.ip` tersisa untuk dev lokal tanpa Cloudflare.
 */
export function clientIp(req: FastifyRequest): string {
  const cf = header(req, 'cf-connecting-ip')
  if (cf) return cf

  const forwarded = header(req, 'x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }

  return req.ip
}

function header(req: FastifyRequest, name: string): string | undefined {
  const raw = req.headers[name]
  const value = Array.isArray(raw) ? raw[0] : raw
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}
