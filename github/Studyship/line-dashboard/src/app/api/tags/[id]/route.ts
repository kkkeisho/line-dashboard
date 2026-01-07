import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

/**
 * PATCH /api/tags/[id]
 * Update a tag (Admin only)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin(req)
    if (session instanceof NextResponse) {
      return session
    }

    const { id } = await params
    const { name, color } = await req.json()

    // タグが存在するか確認
    const existing = await prisma.tag.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    // 名前変更の場合は重複チェック
    if (name && name !== existing.name) {
      const duplicate = await prisma.tag.findUnique({
        where: { name },
      })

      if (duplicate) {
        return NextResponse.json(
          { error: 'Tag name already exists' },
          { status: 409 }
        )
      }
    }

    const updated = await prisma.tag.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(color && { color }),
      },
    })

    return NextResponse.json({ tag: updated })
  } catch (error) {
    console.error('Error updating tag:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/tags/[id]
 * Delete a tag (Admin only)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin(req)
    if (session instanceof NextResponse) {
      return session
    }

    const { id } = await params

    // タグが存在するか確認
    const existing = await prisma.tag.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    // タグを削除（ConversationTagは自動削除される - cascade設定による）
    await prisma.tag.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting tag:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
