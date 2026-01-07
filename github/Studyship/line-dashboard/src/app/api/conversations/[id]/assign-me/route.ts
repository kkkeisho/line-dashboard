import { NextRequest, NextResponse } from 'next/server'
import { requireAgentOrAdmin } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit-service'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAgentOrAdmin(req)
  if (session instanceof NextResponse) {
    return session
  }

  try {
    const { id: conversationId } = await params
    const userId = session.user.id

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        assignedUserId: userId,
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

    await createAuditLog({
      conversationId,
      userId,
      action: 'SELF_ASSIGNED',
      changes: {},
    })

    return NextResponse.json({ conversation: updated })
  } catch (error) {
    console.error('Self assignment error:', error)
    return NextResponse.json(
      { error: 'Failed to assign' },
      { status: 500 }
    )
  }
}
