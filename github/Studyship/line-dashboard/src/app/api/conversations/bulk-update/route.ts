import { NextRequest, NextResponse } from 'next/server'
import { requireAgentOrAdmin } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { Status } from '@prisma/client'
import { createAuditLog } from '@/lib/audit-service'

export async function POST(req: NextRequest) {
  // 権限チェック（Agent または Admin のみ）
  const session = await requireAgentOrAdmin(req)
  if (session instanceof NextResponse) {
    return session
  }

  const { conversationIds, status } = await req.json()

  // バリデーション
  if (!Array.isArray(conversationIds) || conversationIds.length === 0) {
    return NextResponse.json(
      { error: 'conversationIds array is required and must not be empty' },
      { status: 400 }
    )
  }

  if (!status) {
    return NextResponse.json(
      { error: 'Status is required' },
      { status: 400 }
    )
  }

  if (!Object.values(Status).includes(status)) {
    return NextResponse.json(
      { error: 'Invalid status value' },
      { status: 400 }
    )
  }

  // 最大件数チェック（パフォーマンス保護）
  if (conversationIds.length > 100) {
    return NextResponse.json(
      { error: 'Cannot update more than 100 conversations at once' },
      { status: 400 }
    )
  }

  try {
    // バルク更新実行
    const result = await prisma.conversation.updateMany({
      where: {
        id: {
          in: conversationIds,
        },
      },
      data: {
        status,
      },
    })

    // 各会話に対して監査ログを記録
    // Note: updateManyでは個別のversionインクリメントができないため、
    // 楽観的ロックは機能しない。必要に応じて個別更新に変更すること。
    const auditLogPromises = conversationIds.map((conversationId) =>
      createAuditLog({
        conversationId,
        userId: session.user.id,
        action: 'STATUS_BULK_CHANGED',
        changes: {
          to: status,
          bulkOperation: true,
          totalCount: conversationIds.length,
        },
      })
    )

    await Promise.all(auditLogPromises)

    return NextResponse.json({
      success: true,
      updated: result.count,
      requestedCount: conversationIds.length,
    })
  } catch (error) {
    console.error('Bulk update error:', error)
    return NextResponse.json(
      { error: 'Failed to perform bulk update' },
      { status: 500 }
    )
  }
}
