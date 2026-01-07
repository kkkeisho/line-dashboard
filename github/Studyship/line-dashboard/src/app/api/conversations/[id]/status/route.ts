import { NextRequest, NextResponse } from 'next/server'
import { requireAgentOrAdmin } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { Status } from '@prisma/client'
import { createAuditLog } from '@/lib/audit-service'
import { isValidStatusTransition, onStatusChange } from '@/lib/status-service'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 権限チェック（Agent または Admin のみ）
  const session = await requireAgentOrAdmin(req)
  if (session instanceof NextResponse) {
    return session
  }

  const { id } = await params
  const body = await req.json()
  const { status, version } = body

  // ステータスのバリデーション
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

  try {
    // 現在の状態取得
    const current = await prisma.conversation.findUnique({
      where: { id },
    })

    if (!current) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // 楽観的ロック：versionチェック
    if (version !== undefined && current.version !== version) {
      return NextResponse.json(
        {
          error: 'Conversation was updated by another user',
          currentVersion: current.version,
          currentStatus: current.status,
        },
        { status: 409 }
      )
    }

    // ステータス遷移の妥当性チェック
    if (!isValidStatusTransition(current.status, status)) {
      return NextResponse.json(
        {
          error: `Invalid status transition from ${current.status} to ${status}`,
          currentStatus: current.status,
          requestedStatus: status,
        },
        { status: 400 }
      )
    }

    // ステータス更新
    const updated = await prisma.conversation.update({
      where: { id },
      data: {
        status,
        version: {
          increment: 1,
        },
      },
    })

    // 監査ログ記録
    await createAuditLog({
      conversationId: id,
      userId: session.user.id,
      action: 'STATUS_CHANGED',
      changes: {
        from: current.status,
        to: status,
      },
    })

    // ステータス変更時の自動処理
    await onStatusChange(id, status, current.status)

    return NextResponse.json({
      success: true,
      conversation: updated,
    })
  } catch (error) {
    console.error('Status update error:', error)
    return NextResponse.json(
      { error: 'Failed to update status' },
      { status: 500 }
    )
  }
}
