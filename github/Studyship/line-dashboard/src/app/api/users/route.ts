import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'

export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (session instanceof NextResponse) {
    return session
  }

  // Agent/Admin のみ取得（Viewerは除外）
  const users = await prisma.user.findMany({
    where: {
      role: {
        in: [Role.AGENT, Role.ADMIN],
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: {
      name: 'asc',
    },
  })

  return NextResponse.json({ users })
}
