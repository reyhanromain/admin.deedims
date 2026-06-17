import bcrypt from 'bcryptjs'

const ROUNDS = 10

/** Hash password untuk disimpan ke kolom `users.password`. */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS)
}

/** Verifikasi password login terhadap hash tersimpan. */
export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}
