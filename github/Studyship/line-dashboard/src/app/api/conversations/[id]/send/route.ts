import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAgentOrAdmin } from '@/lib/api-auth'
import { sendTextMessage } from '@/lib/line'
import { saveOutboundMessage } from '@/lib/message-service'

/**
 * POST /api/conversations/[id]/send
 * Send a message to a LINE user through a conversation
 *
 * Requires: Agent or Admin role
 * Body: { text: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate user (Agent or Admin only)
    const session = await requireAgentOrAdmin(req)
    if (session instanceof NextResponse) {
      return session
    }

    const { id: conversationId } = await params

    // 2. Parse request body
    const body = await req.json()
    const { text } = body

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message text is required' },
        { status: 400 }
      )
    }

    // 3. Get conversation with contact info
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        contact: true,
      },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // 4. Check if contact is blocked
    if (conversation.contact.isBlocked) {
      return NextResponse.json(
        { error: 'Cannot send message to blocked contact' },
        { status: 403 }
      )
    }

    // 5. Send message via LINE API
    try {
      await sendTextMessage(conversation.contact.lineUserId, text.trim())
    } catch (error) {
      console.error('Failed to send LINE message:', error)
      return NextResponse.json(
        { error: 'Failed to send message to LINE' },
        { status: 500 }
      )
    }

    // 6. Save outbound message to database
    const message = await saveOutboundMessage(conversationId, text.trim())

    // 7. Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'SEND_MESSAGE',
        conversationId,
        changes: {
          messageId: message.id,
          text: text.substring(0, 100), // Store preview only
          contactId: conversation.contact.id,
          contactName: conversation.contact.displayName,
        },
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown',
      },
    })

    console.log('Message sent successfully:', {
      conversationId,
      messageId: message.id,
      userId: session.user.id,
      contactId: conversation.contact.id,
    })

    return NextResponse.json(
      {
        success: true,
        message: {
          id: message.id,
          text: message.text,
          timestamp: message.timestamp,
          direction: message.direction,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
