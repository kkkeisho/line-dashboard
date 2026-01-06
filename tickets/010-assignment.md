# #010 担当者アサイン機能

**優先度**: 高
**Phase**: 4 - コア機能
**依存**: #004, #008
**担当**: Backend Developer

## 目的
Conversationに担当者を割り当てる機能を実装する。

## 受け入れ基準
- [ ] 担当者アサインAPIが実装されている
- [ ] 権限チェックが機能している（Adminのみ、または設定により変更可）
- [ ] アサイン変更が監査ログに記録される
- [ ] Inbox一覧で担当者が表示される
- [ ] 自分の担当会話でフィルタできる

## 実装詳細

### 1. 担当者アサインAPI

#### `src/app/api/conversations/[id]/assign/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { Permissions } from '@/lib/permissions'
import { createAuditLog } from '@/lib/audit-service'
import { Role } from '@prisma/client'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAuth(req)
  if (session instanceof NextResponse) {
    return session
  }

  // 権限チェック
  const userRole = session.user.role as Role
  if (!Permissions.canAssign(userRole)) {
    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 }
    )
  }

  const { assignedUserId } = await req.json()

  try {
    const conversationId = params.id

    // 現在の状態取得
    const current = await prisma.conversation.findUnique({
      where: { id: conversationId },
    })

    if (!current) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // アサイン先ユーザーの存在確認
    if (assignedUserId) {
      const user = await prisma.user.findUnique({
        where: { id: assignedUserId },
      })

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }
    }

    // 担当者更新
    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        assignedUserId: assignedUserId || null,
      },
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // 監査ログ記録
    await createAuditLog({
      conversationId,
      userId: session.user.id,
      action: 'ASSIGNED',
      changes: {
        from: current.assignedUserId,
        to: assignedUserId || null,
      },
    })

    return NextResponse.json({ conversation: updated })
  } catch (error) {
    console.error('Assignment error:', error)
    return NextResponse.json(
      { error: 'Failed to assign' },
      { status: 500 }
    )
  }
}
```

### 2. 自己アサイン機能

#### `src/app/api/conversations/[id]/assign-me/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAgentOrAdmin } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit-service'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAgentOrAdmin(req)
  if (session instanceof NextResponse) {
    return session
  }

  try {
    const conversationId = params.id
    const userId = session.user.id

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        assignedUserId: userId,
      },
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    await createAuditLog({
      conversationId,
      userId,
      action: 'SELF_ASSIGNED',
      changes: {},
    })

    return NextResponse.json({ conversation: updated })
  } catch (error) {
    console.error('Self assignment error:', error)
    return NextResponse.json(
      { error: 'Failed to assign' },
      { status: 500 }
    )
  }
}
```

### 3. ユーザー一覧取得（アサイン用）

#### `src/app/api/users/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'

export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (session instanceof NextResponse) {
    return session
  }

  // Agent/Admin のみ取得（Viewerは除外）
  const users = await prisma.user.findMany({
    where: {
      role: {
        in: [Role.AGENT, Role.ADMIN],
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: {
      name: 'asc',
    },
  })

  return NextResponse.json({ users })
}
```

### 4. 担当会話フィルタ

Inbox API（#008）でフィルタ実装済み：
```typescript
// GET /api/conversations?assignedUserId={userId}
// GET /api/conversations?assignedUserId=me （自分の担当）
```

## テスト項目
- [ ] Admin が担当者を割り当てられる
- [ ] Agent が自己アサインできる
- [ ] Viewer が担当変更すると403エラーが返る
- [ ] 存在しないユーザーIDで404エラーが返る
- [ ] 担当者がInbox一覧に表示される
- [ ] 自分の担当会話でフィルタできる
- [ ] 監査ログに記録される

## 備考
- Phase 2 で自動アサイン機能（ラウンドロビン、負荷分散）
- Phase 2 でチーム/グループ単位のアサイン
