import { NextRequest, NextResponse } from 'next/server'
import { requireAgentOrAdmin } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { Priority, Urgency, ComplaintType } from '@prisma/client'

/**
 * PATCH /api/conversations/[id]/triage
 * Override automatic triage results with manual values
 *
 * Requires: Agent or Admin role
 * Body: { priority?: Priority, urgency?: Urgency, isComplaint?: boolean, complaintType?: ComplaintType | null }
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
    const { priority, urgency, isComplaint, complaintType } = body

    // Validate input
    if (priority && !Object.values(Priority).includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority value' },
        { status: 400 }
      )
    }

    if (urgency && !Object.values(Urgency).includes(urgency)) {
      return NextResponse.json(
        { error: 'Invalid urgency value' },
        { status: 400 }
      )
    }

    if (complaintType && !Object.values(ComplaintType).includes(complaintType)) {
      return NextResponse.json(
        { error: 'Invalid complaintType value' },
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

    // Build update object
    const updates: any = {}
    if (priority !== undefined) updates.priority = priority
    if (urgency !== undefined) updates.urgency = urgency
    if (isComplaint !== undefined) {
      updates.isComplaint = isComplaint
      // If setting isComplaint to false, clear complaintType
      if (!isComplaint) {
        updates.complaintType = null
      }
    }
    if (complaintType !== undefined) updates.complaintType = complaintType

    // Update conversation
    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
      include: {
        contact: true,
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        messages: {
          orderBy: {
            timestamp: 'desc',
          },
          take: 1,
        },
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'OVERRIDE_TRIAGE',
        conversationId,
        changes: {
          oldPriority: conversation.priority,
          newPriority: updates.priority,
          oldUrgency: conversation.urgency,
          newUrgency: updates.urgency,
          oldIsComplaint: conversation.isComplaint,
          newIsComplaint: updates.isComplaint,
          oldComplaintType: conversation.complaintType,
          newComplaintType: updates.complaintType,
        },
        ipAddress:
          req.headers.get('x-forwarded-for') ||
          req.headers.get('x-real-ip') ||
          'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown',
      },
    })

    console.log('Triage manually overridden:', {
      conversationId,
      updates,
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
    console.error('Error overriding triage:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
