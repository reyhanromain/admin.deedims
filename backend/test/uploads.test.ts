import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import FormData from 'form-data'
import { makeApp, resetDb, tokenFor, authH, prisma, data } from './helpers'

let app: FastifyInstance
let token: string

beforeAll(async () => { app = await makeApp() })
afterAll(async () => { await app.close(); await prisma.$disconnect() })
beforeEach(async () => { await resetDb(); token = await tokenFor(app) })

const JPG = Buffer.from(
  '/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAACAAIDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAABgj/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABykX//Z',
  'base64',
)

function multipart(buf: Buffer, filename: string, contentType: string) {
  const form = new FormData()
  form.append('file', buf, { filename, contentType })
  return { headers: { ...form.getHeaders(), ...authH(token) }, payload: form }
}

describe('uploads', () => {
  it('upload JPG → 201 + data.url + variants, file tersaji di /uploads', async () => {
    const { headers, payload } = multipart(JPG, 'a.jpg', 'image/jpeg')
    const res = await app.inject({ method: 'POST', url: '/api/uploads', headers, payload })
    expect(res.statusCode).toBe(201)
    const body = data(res)
    const url = body.url
    expect(url).toMatch(/^\/uploads\/.+\.jpg$/)
    expect(body.variants.thumb).toMatch(/^\/uploads\/.+@thumb\.webp$/)
    expect(body.variants.card).toMatch(/^\/uploads\/.+@card\.webp$/)
    expect(body.variants.detail).toMatch(/^\/uploads\/.+@detail\.webp$/)
    expect(body.variants.large).toMatch(/^\/uploads\/.+@large\.webp$/)

    const served = await app.inject({ method: 'GET', url })
    expect(served.statusCode).toBe(200)
    expect(served.headers['content-type']).toContain('image/jpeg')

    const thumb = await app.inject({ method: 'GET', url: body.variants.thumb })
    expect(thumb.statusCode).toBe(200)
    expect(thumb.headers['content-type']).toContain('image/webp')
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
    form.append('file', JPG, { filename: 'a.jpg', contentType: 'image/jpeg' })
    const res = await app.inject({ method: 'POST', url: '/api/uploads', headers: form.getHeaders(), payload: form })
    expect(res.statusCode).toBe(401)
  })
})
