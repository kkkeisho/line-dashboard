import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAdmin } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/tags
 * Get all tags
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req)
    if (session instanceof NextResponse) {
      return session
    }

    const tags = await prisma.tag.findMany({
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({ tags })
  } catch (error) {
    console.error('Error fetching tags:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/tags
 * Create a new tag (Admin only)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin(req)
    if (session instanceof NextResponse) {
      return session
    }

    const { name, color } = await req.json()

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Tag name is required' },
        { status: 400 }
      )
    }

    // 重複チェック
    const existing = await prisma.tag.findUnique({
      where: { name },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Tag already exists' },
        { status: 409 }
      )
    }

    const tag = await prisma.tag.create({
      data: {
        name: name.trim(),
        color: color || '#6B7280', // デフォルトグレー
      },
    })

    return NextResponse.json({ tag }, { status: 201 })
  } catch (error) {
    console.error('Error creating tag:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
