import { PrismaClient, Role } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Admin ユーザー作成
  const adminPasswordHash = await hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      role: Role.ADMIN,
      passwordHash: adminPasswordHash,
    },
  })
  console.log('✅ Admin user created:', admin.email)

  // Agent ユーザー作成
  const agentPasswordHash = await hash('agent123', 10)
  const agent = await prisma.user.upsert({
    where: { email: 'agent@example.com' },
    update: {},
    create: {
      email: 'agent@example.com',
      name: 'Agent User',
      role: Role.AGENT,
      passwordHash: agentPasswordHash,
    },
  })
  console.log('✅ Agent user created:', agent.email)

  // Viewer ユーザー作成
  const viewerPasswordHash = await hash('viewer123', 10)
  const viewer = await prisma.user.upsert({
    where: { email: 'viewer@example.com' },
    update: {},
    create: {
      email: 'viewer@example.com',
      name: 'Viewer User',
      role: Role.VIEWER,
      passwordHash: viewerPasswordHash,
    },
  })
  console.log('✅ Viewer user created:', viewer.email)

  // デフォルトタグ作成
  const tags = [
    { name: 'VIP', color: '#FFD700' },
    { name: '要注意', color: '#FF0000' },
    { name: '継続中', color: '#00FF00' },
    { name: '解約候補', color: '#FFA500' },
  ]

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { name: tag.name },
      update: {},
      create: tag,
    })
    console.log(`✅ Tag created: ${tag.name}`)
  }

  console.log('🎉 Seed data created successfully!')
  console.log('\n📝 Login credentials:')
  console.log('  Admin:  admin@example.com / admin123')
  console.log('  Agent:  agent@example.com / agent123')
  console.log('  Viewer: viewer@example.com / viewer123')
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
