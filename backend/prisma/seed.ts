import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const prisma = new PrismaClient()
const seedDir = path.dirname(fileURLToPath(import.meta.url))
const seedUploadsDir = path.join(seedDir, 'seed-assets', 'uploads')
const uploadsDir = path.resolve(process.env.UPLOADS_DIR ?? './uploads')

const adminUsername = process.env.SEED_ADMIN_USERNAME ?? 'admin'
const adminName = process.env.SEED_ADMIN_NAME ?? 'Deedims Admin'
const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'deedims123'
const staffPassword = process.env.SEED_USER_PASSWORD ?? adminPassword

const starterUsers = [
  { username: adminUsername, fullName: adminName, password: adminPassword, isSuper: true },
  { username: 'dita', fullName: 'Dita', password: staffPassword, isSuper: false },
]

const starterStock = [
  { label: 'dimsum', name: 'Dimsum', quantity: 36, unit: 'pcs', isActive: true },
  { label: 'chili-oil', name: 'Chili Oil', quantity: 7, unit: 'cup', isActive: true },
]

type StarterMenu = {
  key: string
  name: string
  description: string
  basePrice: number
  unitLabel: string | null
  isActive: boolean
  imageUrl: string | null
  isAddon: boolean
  category?: string | null
  variants: Array<{
    name: string
    price: number
    imageUrl?: string | null
    stock: Array<{ label: string; quantity: number }>
  }>
  addons: string[]
  freeAddons: string[]
}

const starterMenus: StarterMenu[] = [
  {
    key: 'dimsum-mentai',
    name: 'Dimsum Mentai',
    description: 'Dimsum full ayam yang dibalut dengan saus mentai, kemudian dibakar yang membuat rasanya semakin gurih, lembut, dan smooky. Makin enak disajikan dengan hangat.',
    basePrice: 25000,
    unitLabel: 'pack',
    isActive: true,
    imageUrl: '/uploads/6aa98539-8abe-420b-be7c-211997fe0c08.png',
    isAddon: false,
    category: 'ready',
    variants: [
      { name: 'Ngemil (4 pcs)', price: 25000, imageUrl: '/uploads/9029c26b-85d9-4b34-86ea-8aca53c098c8.png', stock: [{ label: 'dimsum', quantity: 4 }] },
      { name: 'Kenyang (6 pcs)', price: 35000, imageUrl: '/uploads/9229f864-0e22-456b-8500-9d15e44009e5.png', stock: [{ label: 'dimsum', quantity: 6 }] },
      { name: 'Mini Party (12 pcs)', price: 70000, imageUrl: '/uploads/32eeb602-6eaf-4a79-84e2-a35878107960.png', stock: [{ label: 'dimsum', quantity: 12 }] },
      { name: 'Full Party (16 pcs)', price: 85000, imageUrl: '/uploads/2b700c38-5adc-4e0f-810c-78f3b710e823.png', stock: [{ label: 'dimsum', quantity: 16 }] },
    ],
    addons: ['chili-oil'],
    freeAddons: ['chili-oil'],
  },
  {
    key: 'dimsum-original',
    name: 'Dimsum Original',
    description: 'Dimsum full ayam disajikan dengan cara dikukus membuat rasanya semakin gurih dan lembut. Ditemani saus cocol yang asam manis',
    basePrice: 30000,
    unitLabel: 'pack',
    isActive: true,
    imageUrl: '/uploads/4653c28f-ca25-4d1c-b2e0-9b50d796ef10.png',
    isAddon: false,
    category: 'ready',
    variants: [
      { name: 'Kenyang (6 pcs)', price: 30000, imageUrl: '/uploads/63a7ca56-521e-48fd-8035-6aee007ae5db.png', stock: [{ label: 'dimsum', quantity: 6 }] },
      { name: 'Mini Party (12 pcs)', price: 55000, imageUrl: '/uploads/d5e34767-6735-43d2-8271-35d106972891.png', stock: [{ label: 'dimsum', quantity: 12 }] },
      { name: 'Full Party (16 pcs)', price: 73000, imageUrl: '/uploads/91c36e52-945a-4696-b047-2a4679fb42e0.png', stock: [{ label: 'dimsum', quantity: 16 }] },
    ],
    addons: ['chili-oil'],
    freeAddons: ['chili-oil'],
  },
  {
    key: 'dimsum-ori-x-mentai',
    name: 'Dimsum Ori X Mentai',
    description: 'Pengen coba dimsum mentai dan original? ini menu yang tepat buat kamu! win win solution.',
    basePrice: 85000,
    unitLabel: 'pack',
    isActive: true,
    imageUrl: '/uploads/a5dc4820-2d71-4b92-84f3-9ef0174403a1.png',
    isAddon: false,
    category: 'ready',
    variants: [
      { name: 'Full Party (8 pcs Ori, 8 pcs Mentai)', price: 85000, stock: [{ label: 'dimsum', quantity: 16 }] },
    ],
    addons: ['chili-oil'],
    freeAddons: ['chili-oil'],
  },
  {
    key: 'chili-oil',
    name: 'Chili Oil',
    description: 'Pedas gurih dengan aroma khas rempah, sempurna untuk menambah cita rasa dimsum.',
    basePrice: 5000,
    unitLabel: 'cup',
    isActive: true,
    imageUrl: '/uploads/0127ca13-6f42-4c6c-8477-3bbcfaa9dc55.png',
    isAddon: true,
    category: 'ready',
    variants: [
      { name: '(default)', price: 5000, stock: [{ label: 'chili-oil', quantity: 1 }] },
    ],
    addons: [],
    freeAddons: [],
  },
]

const starterSettings = [
  {
    label: 'start_quick_intro',
    description: 'Pesan pembuka saat customer kirim /start',
    value: 'Halo kak, selamat datang di Deedims.',
    inputType: 'textarea',
    category: 'bot_messages_start',
    sortOrder: 1,
  },
  {
    label: 'order_menu_page_size',
    description: 'Jumlah menu per halaman di /order',
    value: '8',
    inputType: 'text',
    category: 'pagination',
    sortOrder: 2,
  },
  {
    label: 'cart_edit_page_size',
    description: 'Jumlah item per halaman saat edit cart',
    value: '8',
    inputType: 'text',
    category: 'pagination',
    sortOrder: 3,
  },
  {
    label: 'my_orders_page_size',
    description: 'Jumlah order per halaman di /my_orders',
    value: '5',
    inputType: 'text',
    category: 'pagination',
    sortOrder: 4,
  },
]

async function clearOperationalData() {
  await prisma.botMessage.deleteMany()
  await prisma.cartItem.deleteMany()
  await prisma.preOrderReminderLog.deleteMany()
  await prisma.orderItemStockUsage.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.orderCancellationRequest.deleteMany()
  await prisma.order.deleteMany()
  await prisma.menuAddon.deleteMany()
  await prisma.menuVariantStockUsage.deleteMany()
  await prisma.menuVariant.deleteMany()
  await prisma.menu.deleteMany()
  await prisma.stockItem.deleteMany()
  await prisma.preOrder.deleteMany()
  await prisma.reminderSubscriber.deleteMany()
  await prisma.setting.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.user.deleteMany()
}

async function seedUsers() {
  for (const user of starterUsers) {
    await prisma.user.create({
      data: {
        username: user.username,
        fullName: user.fullName,
        password: await bcrypt.hash(user.password, 10),
        isSuper: user.isSuper,
      },
    })
  }
}

async function seedSettings() {
  await prisma.setting.createMany({ data: starterSettings })
}

async function seedCatalog() {
  const stockByLabel = new Map<string, number>()
  for (const item of starterStock) {
    const stock = await prisma.stockItem.create({ data: item })
    stockByLabel.set(item.label, stock.id)
  }

  const menuByKey = new Map<string, number>()
  for (const menu of starterMenus) {
    const created = await prisma.menu.create({
      data: {
        name: menu.name,
        description: menu.description,
        basePrice: menu.basePrice,
        unitLabel: menu.unitLabel,
        isActive: menu.isActive,
        imageUrl: menu.imageUrl,
        isAddon: menu.isAddon,
        category: menu.category ?? null,
        variants: {
          create: menu.variants.map((variant) => ({
            name: variant.name,
            price: variant.price,
            imageUrl: variant.imageUrl ?? null,
            stockUsages: {
              create: variant.stock.map((usage) => ({
                stockItemId: stockByLabel.get(usage.label)!,
                quantity: usage.quantity,
              })),
            },
          })),
        },
      },
    })
    menuByKey.set(menu.key, created.id)
  }

  for (const menu of starterMenus) {
    const menuId = menuByKey.get(menu.key)!
    for (const addonKey of Array.from(new Set(menu.addons))) {
      await prisma.menuAddon.create({
        data: {
          menuId,
          addonMenuId: menuByKey.get(addonKey)!,
          isFree: false,
          isRequired: false,
          maxQuantity: 1,
          sortOrder: 0,
        },
      })
    }
    for (const addonKey of Array.from(new Set(menu.freeAddons))) {
      await prisma.menuAddon.create({
        data: {
          menuId,
          addonMenuId: menuByKey.get(addonKey)!,
          isFree: true,
          isRequired: false,
          maxQuantity: 1,
          sortOrder: 0,
        },
      })
    }
  }
}

function seedUploadAssets() {
  mkdirSync(uploadsDir, { recursive: true })
  for (const filename of readdirSync(seedUploadsDir)) {
    copyFileSync(path.join(seedUploadsDir, filename), path.join(uploadsDir, filename))
  }
}

async function main() {
  await clearOperationalData()
  await seedUsers()
  await seedSettings()
  await seedCatalog()
  seedUploadAssets()

  console.log(`Starter seed selesai. Login CMS: ${adminUsername} / ${adminPassword}`)
  console.log(`User staff: dita / ${staffPassword}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
