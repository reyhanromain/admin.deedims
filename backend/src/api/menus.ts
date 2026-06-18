import type { FastifyInstance } from 'fastify'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../db'
import { HttpError, ok, pageMeta } from '../lib/http'
import { parsePage } from '../lib/paginate'

const idOf = (req: { params: unknown }) => Number((req.params as { id: string }).id)

const menuWithRelations = {
  variants: { include: { stockUsages: true }, orderBy: { id: 'asc' } },
  addonLinks: true,
} satisfies Prisma.MenuInclude

type MenuRow = Prisma.MenuGetPayload<{ include: typeof menuWithRelations }>

/** DTO menu untuk editor FE: addons = berbayar; freeAddons = gratis otomatis. */
function shapeMenu(m: MenuRow) {
  return {
    id: m.id,
    name: m.name,
    description: m.description,
    basePrice: m.basePrice,
    isActive: m.isActive,
    isAddon: m.isAddon,
    imageUrl: m.imageUrl,
    variants: m.variants.map((v) => ({
      name: v.name,
      price: v.price,
      stockId: v.stockUsages[0]?.stockItemId ?? null,
      qty: v.stockUsages[0]?.quantity ?? null,
    })),
    addons: Array.from(new Set(m.addonLinks.filter((a) => !a.isFree).map((a) => a.addonMenuId))),
    freeAddons: m.addonLinks.filter((a) => a.isFree).map((a) => a.addonMenuId),
  }
}

const variantSchema = z.object({
  name: z.string().nullable().optional(),
  price: z.number().int(),
  stockId: z.number().int().nullable().optional(),
  qty: z.number().int().nullable().optional(),
})

const menuSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  basePrice: z.number().int().default(0),
  isActive: z.boolean().default(true),
  isAddon: z.boolean().default(false),
  imageUrl: z.string().nullable().optional(),
  telegramFileId: z.string().nullable().optional(),
  variants: z.array(variantSchema).default([]),
  addons: z.array(z.number().int()).default([]),
  freeAddons: z.array(z.number().int()).default([]),
})

type MenuInput = z.infer<typeof menuSchema>

async function writeChildren(tx: Prisma.TransactionClient, menuId: number, data: MenuInput) {
  for (const v of data.variants) {
    await tx.menuVariant.create({
      data: {
        menuId,
        name: v.name ?? null,
        price: v.price,
        stockUsages: v.stockId != null ? { create: [{ stockItemId: v.stockId, quantity: v.qty ?? 1 }] } : undefined,
      },
    })
  }
  if (!data.isAddon) {
    for (const addonMenuId of Array.from(new Set(data.addons))) {
      await tx.menuAddon.create({ data: { menuId, addonMenuId, isFree: false } })
    }
    for (const addonMenuId of Array.from(new Set(data.freeAddons))) {
      await tx.menuAddon.create({ data: { menuId, addonMenuId, isFree: true } })
    }
  }
}

export async function menusRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate)

  // GET /api/menus?page=&limit=
  app.get('/', async (req) => {
    const { skip, take, page, limit } = parsePage(req)
    const [total, menus] = await Promise.all([
      prisma.menu.count(),
      prisma.menu.findMany({ include: menuWithRelations, orderBy: { id: 'asc' }, skip, take }),
    ])
    return ok(menus.map(shapeMenu), pageMeta(total, page, limit))
  })

  // GET /api/menus/:id
  app.get('/:id', async (req) => {
    const menu = await prisma.menu.findUnique({ where: { id: idOf(req) }, include: menuWithRelations })
    if (!menu) throw new HttpError(404, 'Menu tidak ditemukan', 'NOT_FOUND')
    return ok(shapeMenu(menu))
  })

  // POST /api/menus
  app.post('/', async (req, reply) => {
    const parsed = menuSchema.safeParse(req.body)
    if (!parsed.success) throw new HttpError(400, 'Invalid payload', 'VALIDATION')
    const d = parsed.data

    const id = await prisma.$transaction(async (tx) => {
      const created = await tx.menu.create({
        data: {
          name: d.name, description: d.description ?? null, basePrice: d.basePrice, isActive: d.isActive,
          isAddon: d.isAddon, imageUrl: d.imageUrl ?? null, telegramFileId: d.telegramFileId ?? null,
        },
      })
      await writeChildren(tx, created.id, d)
      return created.id
    })

    const menu = await prisma.menu.findUnique({ where: { id }, include: menuWithRelations })
    reply.code(201)
    return ok(shapeMenu(menu!))
  })

  // PATCH /api/menus/:id — ganti field + recreate variants & add-on links
  app.patch('/:id', async (req) => {
    const id = idOf(req)
    const parsed = menuSchema.safeParse(req.body)
    if (!parsed.success) throw new HttpError(400, 'Invalid payload', 'VALIDATION')
    const d = parsed.data

    const exists = await prisma.menu.findUnique({ where: { id } })
    if (!exists) throw new HttpError(404, 'Menu tidak ditemukan', 'NOT_FOUND')

    await prisma.$transaction(async (tx) => {
      // Ganti foto → cache telegram_file_id basi (kecuali dikirim eksplisit).
      const nextFileId =
        d.telegramFileId !== undefined ? d.telegramFileId : exists.imageUrl !== (d.imageUrl ?? null) ? null : exists.telegramFileId

      await tx.menu.update({
        where: { id },
        data: { name: d.name, description: d.description ?? null, basePrice: d.basePrice, isActive: d.isActive, isAddon: d.isAddon, imageUrl: d.imageUrl ?? null, telegramFileId: nextFileId },
      })

      const oldVariants = await tx.menuVariant.findMany({ where: { menuId: id }, select: { id: true } })
      await tx.menuVariantStockUsage.deleteMany({ where: { menuVariantId: { in: oldVariants.map((v) => v.id) } } })
      await tx.menuVariant.deleteMany({ where: { menuId: id } })
      await tx.menuAddon.deleteMany({ where: { menuId: id } })
      await writeChildren(tx, id, d)
    })

    const menu = await prisma.menu.findUnique({ where: { id }, include: menuWithRelations })
    return ok(shapeMenu(menu!))
  })

  // POST /api/menus/:id/toggle — aktif / nonaktif
  app.post('/:id/toggle', async (req) => {
    const id = idOf(req)
    const menu = await prisma.menu.findUnique({ where: { id } })
    if (!menu) throw new HttpError(404, 'Menu tidak ditemukan', 'NOT_FOUND')
    const u = await prisma.menu.update({ where: { id }, data: { isActive: !menu.isActive } })
    return ok({ id: u.id, isActive: u.isActive })
  })
}
