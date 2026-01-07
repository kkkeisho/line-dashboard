import { NextRequest, NextResponse } from 'next/server'
import { requireAgentOrAdmin } from '@/lib/api-auth'
import { updateConversationPriority } from '@/lib/conversation-service'
import { prisma } from '@/lib/prisma'
import { Priority, Urgency } from '@prisma/client'

/**
 * PATCH /api/conversations/[id]/priority
 * Update conversation priority and urgency
 *
 * Requires: Agent or Admin role
 * Body: { priority: Priority, urgency: Urgency }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user (Agent or Admin only)
    const session = await requireAgentOrAdmin(req)
    if (session instanceof NextResponse) {
      return session
    }

    const { id: conversationId } = await params

    // Parse request body
    const body = await req.json()
    const { priority, urgency } = body

    if (!priority || !Object.values(Priority).includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority value' },
        { status: 400 }
      )
    }

    if (!urgency || !Object.values(Urgency).includes(urgency)) {
      return NextResponse.json(
        { error: 'Invalid urgency value' },
        { status: 400 }
      )
    }

    // Check if conversation exists
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Update priority and urgency
    const updated = await updateConversationPriority(
      conversationId,
      priority,
      urgency
    )

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE_PRIORITY',
        conversationId,
        changes: {
          oldPriority: conversation.priority,
          newPriority: priority,
          oldUrgency: conversation.urgency,
          newUrgency: urgency,
        },
        ipAddress:
          req.headers.get('x-forwarded-for') ||
          req.headers.get('x-real-ip') ||
          'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown',
      },
    })

    console.log('Priority updated:', {
      conversationId,
      oldPriority: conversation.priority,
      newPriority: priority,
      oldUrgency: conversation.urgency,
      newUrgency: urgency,
      userId: session.user.id,
    })

    return NextResponse.json(
      {
        success: true,
        conversation: updated,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error updating conversation priority:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
