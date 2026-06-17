import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from '../../src/auth/password'

describe('password helpers', () => {
  it('hash berbeda dari plaintext', async () => {
    const hash = await hashPassword('rahasia')
    expect(hash).not.toBe('rahasia')
    expect(hash.length).toBeGreaterThan(20)
  })

  it('verify benar untuk password yang cocok', async () => {
    const hash = await hashPassword('rahasia')
    expect(await verifyPassword('rahasia', hash)).toBe(true)
  })

  it('verify salah untuk password keliru', async () => {
    const hash = await hashPassword('rahasia')
    expect(await verifyPassword('salah', hash)).toBe(false)
  })
})
