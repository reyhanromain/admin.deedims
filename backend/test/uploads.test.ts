import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import FormData from 'form-data'
import { makeApp, resetDb, tokenFor, authH, prisma, data } from './helpers'

let app: FastifyInstance
let token: string

beforeAll(async () => { app = await makeApp() })
afterAll(async () => { await app.close(); await prisma.$disconnect() })
beforeEach(async () => { await resetDb(); token = await tokenFor(app) })

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

function multipart(buf: Buffer, filename: string, contentType: string) {
  const form = new FormData()
  form.append('file', buf, { filename, contentType })
  return { headers: { ...form.getHeaders(), ...authH(token) }, payload: form }
}

describe('uploads', () => {
  it('upload PNG → 201 + data.url, file tersaji di /uploads', async () => {
    const { headers, payload } = multipart(PNG, 'a.png', 'image/png')
    const res = await app.inject({ method: 'POST', url: '/api/uploads', headers, payload })
    expect(res.statusCode).toBe(201)
    const url = data(res).url
    expect(url).toMatch(/^\/uploads\/.+\.png$/)

    const served = await app.inject({ method: 'GET', url })
    expect(served.statusCode).toBe(200)
    expect(served.headers['content-type']).toContain('image/png')
  })

  it('tipe bukan gambar → 415', async () => {
    const { headers, payload } = multipart(Buffer.from('halo'), 'a.txt', 'text/plain')
    const res = await app.inject({ method: 'POST', url: '/api/uploads', headers, payload })
    expect(res.statusCode).toBe(415)
  })

  it('file melebihi batas → 413', async () => {
    const big = Buffer.alloc(2 * 1024 * 1024, 1)
    const { headers, payload } = multipart(big, 'big.png', 'image/png')
    const res = await app.inject({ method: 'POST', url: '/api/uploads', headers, payload })
    expect(res.statusCode).toBe(413)
  })

  it('tanpa auth → 401', async () => {
    const form = new FormData()
    form.append('file', PNG, { filename: 'a.png', contentType: 'image/png' })
    const res = await app.inject({ method: 'POST', url: '/api/uploads', headers: form.getHeaders(), payload: form })
    expect(res.statusCode).toBe(401)
  })
})
