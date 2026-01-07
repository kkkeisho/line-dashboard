import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { Status, Priority, Urgency } from '@prisma/client'

/**
 * GET /api/conversations
 * Get list of conversations with filters and pagination
 *
 * Query parameters:
 * - status: Filter by status
 * - assignedUserId: Filter by assigned user
 * - priority: Filter by priority
 * - urgency: Filter by urgency
 * - isComplaint: Filter complaints (true/false)
 * - tagId: Filter by tag ID
 * - search: Search in contact name or memo
 * - page: Page number (default: 1)
 * - limit: Results per page (default: 50)
 */
export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const session = await requireAuth(req)
    if (session instanceof NextResponse) {
      return session
    }

    const { searchParams } = new URL(req.url)

    // Filter parameters
    const status = searchParams.get('status') as Status | null
    const assignedUserId = searchParams.get('assignedUserId')
    const priority = searchParams.get('priority') as Priority | null
    const urgency = searchParams.get('urgency') as Urgency | null
    const isComplaint = searchParams.get('isComplaint')
    const tagId = searchParams.get('tagId')
    const search = searchParams.get('search')

    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Build WHERE clause
    const where: any = {}

    if (status) {
      where.status = status
    }

    if (assignedUserId) {
      where.assignedUserId = assignedUserId
    }

    if (priority) {
      where.priority = priority
    }

    if (urgency) {
      where.urgency = urgency
    }

    if (isComplaint === 'true') {
      where.isComplaint = true
    }

    if (tagId) {
      where.tags = {
        some: {
          tagId,
        },
      }
    }

    if (search) {
      where.OR = [
        {
          contact: {
            displayName: {
              contains: search,
              mode: 'insensitive' as const,
            },
          },
        },
        {
          contact: {
            memo: {
              contains: search,
              mode: 'insensitive' as const,
            },
          },
        },
      ]
    }

    // Fetch conversations and total count in parallel
    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          contact: {
            select: {
              id: true,
              displayName: true,
              pictureUrl: true,
              isBlocked: true,
            },
          },
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
        },
        orderBy: [
          { urgency: 'asc' }, // NOW → TODAY → THIS_WEEK → ANYTIME
          { lastInboundAt: 'desc' },
        ],
        skip: offset,
        take: limit,
      }),
      prisma.conversation.count({ where }),
    ])

    return NextResponse.json({
      conversations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
