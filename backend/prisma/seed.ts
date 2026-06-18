import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const adminUsername = process.env.SEED_ADMIN_USERNAME ?? 'admin'
const adminName = process.env.SEED_ADMIN_NAME ?? 'Deedims Admin'
const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'deedims123'
const staffPassword = process.env.SEED_USER_PASSWORD ?? adminPassword

const starterUsers = [
  { username: adminUsername, fullName: adminName, password: adminPassword, isSuper: true },
  { username: 'dita', fullName: 'Dita', password: staffPassword, isSuper: false },
]

const starterStock = [
  { label: 'dimsum', name: 'Dimsum', quantity: 0, unit: 'pcs', isActive: true },
  { label: 'chili-oil', name: 'Chili Oil', quantity: 0, unit: 'cup', isActive: true },
]

type StarterMenu = {
  key: string
  name: string
  description: string
  basePrice: number
  isActive: boolean
  imageUrl: string | null
  isAddon: boolean
  variants: Array<{
    name: string
    price: number
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
    isActive: false,
    imageUrl: '/uploads/ebdb321d-de8c-4e46-9b91-b80677003cd6.png',
    isAddon: false,
    variants: [
      { name: 'Ngemil', price: 25000, stock: [{ label: 'dimsum', quantity: 4 }] },
      { name: 'Kenyang', price: 35000, stock: [{ label: 'dimsum', quantity: 6 }] },
      { name: 'Mini Party', price: 70000, stock: [{ label: 'dimsum', quantity: 12 }] },
      { name: 'Full Party', price: 85000, stock: [{ label: 'dimsum', quantity: 16 }] },
    ],
    addons: ['chili-oil'],
    freeAddons: ['chili-oil'],
  },
  {
    key: 'dimsum-original',
    name: 'Dimsum Original',
    description: 'Dimsum full ayam disajikan dengan cara dikukus membuat rasanya semakin gurih dan lembut. Ditemani saus cocol yang asam manis',
    basePrice: 30000,
    isActive: false,
    imageUrl: '/uploads/4653c28f-ca25-4d1c-b2e0-9b50d796ef10.png',
    isAddon: false,
    variants: [
      { name: 'Kenyang', price: 30000, stock: [{ label: 'dimsum', quantity: 6 }] },
      { name: 'Mini Party', price: 55000, stock: [{ label: 'dimsum', quantity: 12 }] },
      { name: 'Full Party', price: 73000, stock: [{ label: 'dimsum', quantity: 16 }] },
    ],
    addons: ['chili-oil'],
    freeAddons: [],
  },
  {
    key: 'dimsum-ori-x-mentai',
    name: 'Dimsum Ori X Mentai',
    description: 'Pengen coba dimsum mentai dan original? ini menu yang tepat buat kamu! win win solution.',
    basePrice: 85000,
    isActive: false,
    imageUrl: null,
    isAddon: false,
    variants: [
      { name: '(default)', price: 85000, stock: [{ label: 'dimsum', quantity: 16 }] },
    ],
    addons: ['chili-oil'],
    freeAddons: [],
  },
  {
    key: 'chili-oil',
    name: 'Chili Oil',
    description: 'Pedas gurih dengan aroma khas rempah, sempurna untuk menambah cita rasa dimsum.',
    basePrice: 5000,
    isActive: false,
    imageUrl: '/uploads/0127ca13-6f42-4c6c-8477-3bbcfaa9dc55.png',
    isAddon: true,
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
    sortOrder: 1,
  },
  {
    label: 'order_menu_page_size',
    description: 'Jumlah menu per halaman di /order',
    value: '8',
    inputType: 'text',
    sortOrder: 2,
  },
  {
    label: 'cart_edit_page_size',
    description: 'Jumlah item per halaman saat edit cart',
    value: '8',
    inputType: 'text',
    sortOrder: 3,
  },
  {
    label: 'my_orders_page_size',
    description: 'Jumlah order per halaman di /my_orders',
    value: '5',
    inputType: 'text',
    sortOrder: 4,
  },
]

async function clearOperationalData() {
  await prisma.botMessage.deleteMany()
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
        isActive: menu.isActive,
        imageUrl: menu.imageUrl,
        isAddon: menu.isAddon,
        variants: {
          create: menu.variants.map((variant) => ({
            name: variant.name,
            price: variant.price,
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

async function main() {
  await clearOperationalData()
  await seedUsers()
  await seedSettings()
  await seedCatalog()

  console.log(`Starter seed selesai. Login CMS: ${adminUsername} / ${adminPassword}`)
  console.log(`User staff: dita / ${staffPassword}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
