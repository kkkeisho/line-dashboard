import { NextRequest, NextResponse } from 'next/server'
import { requireAgentOrAdmin } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 権限チェック（Agent または Admin のみ）
  const session = await requireAgentOrAdmin(req)
  if (session instanceof NextResponse) {
    return session
  }

  const { id } = await params
  const { text } = await req.json()

  if (!text) {
    return NextResponse.json(
      { error: 'Text is required' },
      { status: 400 }
    )
  }

  try {
    // 会話が存在するか確認
    const conversation = await prisma.conversation.findUnique({
      where: { id },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // メッセージを作成
    const message = await prisma.message.create({
      data: {
        conversationId: id,
        direction: 'OUTBOUND',
        text,
        timestamp: new Date(),
      },
    })

    // 会話情報を更新
    await prisma.conversation.update({
      where: { id },
      data: {
        lastOutboundAt: new Date(),
        lastMessagePreview: text,
        updatedAt: new Date(),
      },
    })

    // 監査ログを記録
    await prisma.auditLog.create({
      data: {
        conversationId: id,
        userId: session.user.id,
        action: 'REPLY_SENT',
        changes: {
          messageId: message.id,
          text: text.substring(0, 100),
        },
      },
    })

    return NextResponse.json({
      success: true,
      message,
    })
  } catch (error) {
    console.error('Error creating reply:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
