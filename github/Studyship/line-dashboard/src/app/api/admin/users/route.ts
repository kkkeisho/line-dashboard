import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { createUser } from '@/lib/auth'
import { Role } from '@prisma/client'

/**
 * GET /api/admin/users
 * Get all users (Admin only)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireAdmin(req)
    if (session instanceof NextResponse) {
      return session
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/users
 * Create a new user (Admin only)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin(req)
    if (session instanceof NextResponse) {
      return session
    }

    const { email, password, name, role } = await req.json()

    // バリデーション
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // メールアドレスの重複チェック
    const existing = await prisma.user.findUnique({
      where: { email },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // ユーザー作成
    const user = await createUser(
      email.trim(),
      password,
      name.trim(),
      role || Role.AGENT
    )

    // パスワードハッシュは返さない
    const { passwordHash, ...userWithoutPassword } = user

    return NextResponse.json({ user: userWithoutPassword }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
