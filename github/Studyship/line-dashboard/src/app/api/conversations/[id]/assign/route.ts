import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { Permissions } from '@/lib/permissions'
import { createAuditLog } from '@/lib/audit-service'
import { Role } from '@prisma/client'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth(req)
  if (session instanceof NextResponse) {
    return session
  }

  // 権限チェック
  const userRole = session.user.role as Role
  if (!Permissions.canAssign(userRole)) {
    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 }
    )
  }

  const { assignedUserId } = await req.json()

  try {
    const { id: conversationId } = await params

    // 現在の状態取得
    const current = await prisma.conversation.findUnique({
      where: { id: conversationId },
    })

    if (!current) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // アサイン先ユーザーの存在確認
    if (assignedUserId) {
      const user = await prisma.user.findUnique({
        where: { id: assignedUserId },
      })

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }
    }

    // 担当者更新
    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        assignedUserId: assignedUserId || null,
      },
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // 監査ログ記録
    await createAuditLog({
      conversationId,
      userId: session.user.id,
      action: 'ASSIGNED',
      changes: {
        from: current.assignedUserId,
        to: assignedUserId || null,
      },
    })

    return NextResponse.json({ conversation: updated })
  } catch (error) {
    console.error('Assignment error:', error)
    return NextResponse.json(
      { error: 'Failed to assign' },
      { status: 500 }
    )
  }
}
