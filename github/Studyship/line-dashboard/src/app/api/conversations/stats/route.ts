import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { Status } from '@prisma/client'
import { needsAction } from '@/lib/conversation-service'

/**
 * GET /api/conversations/stats
 * Get conversation statistics
 *
 * Returns:
 * - Count by status
 * - Count of conversations needing action
 */
export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const session = await requireAuth(req)
    if (session instanceof NextResponse) {
      return session
    }

    // Get counts by status
    const stats = await prisma.conversation.groupBy({
      by: ['status'],
      _count: true,
    })

    // Get conversations that potentially need action
    const potentialNeedsAction = await prisma.conversation.findMany({
      where: {
        status: {
          in: [Status.NEW, Status.WORKING, Status.PENDING],
        },
      },
      select: {
        id: true,
        status: true,
        lastInboundAt: true,
        lastOutboundAt: true,
      },
    })

    // Filter using needsAction logic
    const needsActionCount = potentialNeedsAction.filter(needsAction).length

    // Format stats for easier consumption
    const statsByStatus = stats.reduce((acc, stat) => {
      acc[stat.status] = stat._count
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      stats: statsByStatus,
      needsActionCount,
      total: await prisma.conversation.count(),
    })
  } catch (error) {
    console.error('Error fetching conversation stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
