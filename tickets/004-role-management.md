# #004 権限管理（Admin/Agent/Viewer）

**優先度**: 高
**Phase**: 2 - 認証・権限
**依存**: #003
**担当**: Backend Developer

## 目的
ユーザーの役割（Admin/Agent/Viewer）に基づいたアクセス制御を実装する。

## 受け入れ基準
- [ ] Admin/Agent/Viewerの3つの役割が定義されている
- [ ] 役割に応じてAPIエンドポイントへのアクセスが制御される
- [ ] Viewerは返信・編集ができない（閲覧のみ）
- [ ] Agentは返信・ステータス変更ができる
- [ ] Adminは全ての操作＋ユーザー管理ができる
- [ ] UIで権限に応じてボタン・フォームが非表示になる

## 実装詳細

### 1. 権限定義（既に #002 で定義済み）
```prisma
enum Role {
  ADMIN
  AGENT
  VIEWER
}
```

### 2. 権限チェックユーティリティ

#### `src/lib/permissions.ts`
```typescript
import { Role } from '@prisma/client'

export const Permissions = {
  // 返信権限
  canReply: (role: Role) => {
    return role === Role.ADMIN || role === Role.AGENT
  },

  // ステータス変更権限
  canUpdateStatus: (role: Role) => {
    return role === Role.ADMIN || role === Role.AGENT
  },

  // 担当者アサイン権限
  canAssign: (role: Role) => {
    return role === Role.ADMIN
    // 将来的に Agent でもアサイン可能にする場合は条件追加
  },

  // タグ編集権限
  canManageTags: (role: Role) => {
    return role === Role.ADMIN || role === Role.AGENT
  },

  // ユーザー管理権限
  canManageUsers: (role: Role) => {
    return role === Role.ADMIN
  },

  // 監査ログ閲覧権限
  canViewAuditLogs: (role: Role) => {
    return role === Role.ADMIN
  },

  // 会話閲覧権限（全員）
  canViewConversation: (role: Role) => {
    return true
  },
}
```

### 3. API権限チェックミドルウェア

#### `src/lib/api-auth.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { Permissions } from './permissions'
import { Role } from '@prisma/client'

export async function requireAuth(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return session
}

export async function requireRole(req: NextRequest, allowedRoles: Role[]) {
  const session = await requireAuth(req)

  if (session instanceof NextResponse) {
    return session // Already an error response
  }

  if (!allowedRoles.includes(session.user.role as Role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return session
}

// 使用例
export async function requireAdmin(req: NextRequest) {
  return await requireRole(req, [Role.ADMIN])
}

export async function requireAgentOrAdmin(req: NextRequest) {
  return await requireRole(req, [Role.ADMIN, Role.AGENT])
}
```

### 4. API エンドポイントでの使用例

#### `src/app/api/conversations/[id]/reply/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAgentOrAdmin } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // 権限チェック（Agent または Admin のみ）
  const session = await requireAgentOrAdmin(req)
  if (session instanceof NextResponse) {
    return session
  }

  const { text } = await req.json()

  // 返信処理...
  return NextResponse.json({ success: true })
}
```

### 5. フロントエンドでの権限チェック

#### `src/hooks/usePermissions.ts`
```typescript
import { useSession } from 'next-auth/react'
import { Permissions } from '@/lib/permissions'
import { Role } from '@prisma/client'

export function usePermissions() {
  const { data: session } = useSession()
  const role = session?.user?.role as Role | undefined

  return {
    canReply: role ? Permissions.canReply(role) : false,
    canUpdateStatus: role ? Permissions.canUpdateStatus(role) : false,
    canAssign: role ? Permissions.canAssign(role) : false,
    canManageTags: role ? Permissions.canManageTags(role) : false,
    canManageUsers: role ? Permissions.canManageUsers(role) : false,
    canViewAuditLogs: role ? Permissions.canViewAuditLogs(role) : false,
    isAdmin: role === Role.ADMIN,
    isAgent: role === Role.AGENT,
    isViewer: role === Role.VIEWER,
  }
}
```

#### `src/components/ReplyForm.tsx`（使用例）
```typescript
'use client'

import { usePermissions } from '@/hooks/usePermissions'

export function ReplyForm({ conversationId }: { conversationId: string }) {
  const { canReply } = usePermissions()

  if (!canReply) {
    return (
      <div className="text-gray-500">
        返信権限がありません（閲覧のみ）
      </div>
    )
  }

  return (
    <form>
      {/* 返信フォーム */}
    </form>
  )
}
```

### 6. 権限エラーハンドリング

#### `src/components/ErrorBoundary.tsx`
```typescript
export function PermissionDenied() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-600">アクセス拒否</h1>
        <p className="mt-2 text-gray-600">
          この操作を行う権限がありません
        </p>
      </div>
    </div>
  )
}
```

## テスト項目
- [ ] Viewerユーザーで返信APIを呼ぶと403エラーが返る
- [ ] Agentユーザーで返信ができる
- [ ] Adminユーザーでユーザー管理画面にアクセスできる
- [ ] Agent/Viewerではユーザー管理画面にアクセスできない
- [ ] UIで権限に応じて返信ボタンが表示/非表示になる

## 備考
- Phase 2 でチーム/グループ単位の権限管理を追加予定
- Phase 2 で細かい権限（タグ管理者、レポート閲覧者など）を追加予定
