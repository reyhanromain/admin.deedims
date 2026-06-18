import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const adminUsername = process.env.SEED_ADMIN_USERNAME ?? 'admin'
const adminName = process.env.SEED_ADMIN_NAME ?? 'Deedims Admin'
const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'deedims123'

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

async function seedAdmin() {
  await prisma.user.create({
    data: {
      username: adminUsername,
      fullName: adminName,
      password: await bcrypt.hash(adminPassword, 10),
      isSuper: true,
    },
  })
}

async function seedSettings() {
  await prisma.setting.createMany({
    data: [
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
    ],
  })
}

async function main() {
  await clearOperationalData()
  await seedAdmin()
  await seedSettings()

  console.log(`Blank seed selesai. Login CMS: ${adminUsername} / ${adminPassword}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
