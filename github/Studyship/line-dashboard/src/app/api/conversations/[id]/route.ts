import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { getConversationById } from '@/lib/conversation-service'

/**
 * GET /api/conversations/[id]
 * Get a single conversation with full details
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const session = await requireAuth(req)
    if (session instanceof NextResponse) {
      return session
    }

    const { id } = await params

    // Get conversation with all related data
    const conversation = await getConversationById(id)

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ conversation })
  } catch (error) {
    console.error('Error fetching conversation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
