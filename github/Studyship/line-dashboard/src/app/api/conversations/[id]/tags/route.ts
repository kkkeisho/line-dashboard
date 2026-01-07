import { NextRequest, NextResponse } from 'next/server'
import { requireAgentOrAdmin } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/conversations/[id]/tags
 * Add a tag to a conversation
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAgentOrAdmin(req)
    if (session instanceof NextResponse) {
      return session
    }

    const { id: conversationId } = await params
    const { tagId } = await req.json()

    if (!tagId) {
      return NextResponse.json({ error: 'tagId is required' }, { status: 400 })
    }

    // Conversation取得
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // タグ存在確認
    const tag = await prisma.tag.findUnique({
      where: { id: tagId },
    })

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    // 既に付与されている場合はスキップ
    const existing = await prisma.conversationTag.findFirst({
      where: {
        conversationId,
        tagId,
      },
    })

    if (existing) {
      return NextResponse.json({ success: true, message: 'Tag already added' })
    }

    // タグ付与
    await prisma.conversationTag.create({
      data: {
        conversationId,
        contactId: conversation.contactId,
        tagId,
      },
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Error adding tag to conversation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/conversations/[id]/tags?tagId=xxx
 * Remove a tag from a conversation
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAgentOrAdmin(req)
    if (session instanceof NextResponse) {
      return session
    }

    const { searchParams } = new URL(req.url)
    const tagId = searchParams.get('tagId')

    if (!tagId) {
      return NextResponse.json({ error: 'tagId is required' }, { status: 400 })
    }

    const { id: conversationId } = await params

    // タグが付与されているか確認
    const existing = await prisma.conversationTag.findFirst({
      where: {
        conversationId,
        tagId,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Tag not found on conversation' },
        { status: 404 }
      )
    }

    // タグ削除
    await prisma.conversationTag.deleteMany({
      where: {
        conversationId,
        tagId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing tag from conversation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
