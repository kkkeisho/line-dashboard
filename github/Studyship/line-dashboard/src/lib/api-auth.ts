import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { Role } from '@prisma/client'

export async function requireAuth(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return session
}

export async function requireRole(req: NextRequest, allowedRoles: Role[]) {
  const session = await requireAuth(req)

  if (session instanceof NextResponse) {
    return session // Already an error response
  }

  if (!allowedRoles.includes(session.user.role as Role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return session
}

// 使用例
export async function requireAdmin(req: NextRequest) {
  return await requireRole(req, [Role.ADMIN])
}

export async function requireAgentOrAdmin(req: NextRequest) {
  return await requireRole(req, [Role.ADMIN, Role.AGENT])
}
