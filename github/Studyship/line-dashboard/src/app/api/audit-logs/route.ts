import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/audit-logs
 * Retrieve audit logs with filtering and pagination
 *
 * Requires: Admin role
 * Query params:
 *   - conversationId: Filter by conversation
 *   - userId: Filter by user
 *   - action: Filter by action type
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 100)
 */
export async function GET(req: NextRequest) {
  try {
    // Authenticate user (Admin only)
    const session = await requireAdmin(req)
    if (session instanceof NextResponse) {
      return session
    }

    const { searchParams } = new URL(req.url)

    // フィルタパラメータ
    const conversationId = searchParams.get('conversationId')
    const userId = searchParams.get('userId')
    const action = searchParams.get('action')

    // ページネーションパラメータ
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500) // 最大500件
    const offset = (page - 1) * limit

    // WHERE条件を構築
    const where: any = {}

    if (conversationId) {
      where.conversationId = conversationId
    }

    if (userId) {
      where.userId = userId
    }

    if (action) {
      where.action = action
    }

    // 監査ログ取得とカウントを並列実行
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          conversation: {
            select: {
              id: true,
              status: true,
              contact: {
                select: {
                  id: true,
                  displayName: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: offset,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ])

    console.log('Audit logs retrieved:', {
      total,
      page,
      limit,
      filters: { conversationId, userId, action },
      requestedBy: session.user.id,
    })

    return NextResponse.json(
      {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error retrieving audit logs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
