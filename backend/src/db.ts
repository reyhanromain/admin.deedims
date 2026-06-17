import { PrismaClient } from '@prisma/client'

/** Satu Prisma Client untuk seluruh proses (bot + API + cron menulis ke DB yang sama). */
export const prisma = new PrismaClient()
