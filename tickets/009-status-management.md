# #009 ステータス管理機能

**優先度**: 高
**Phase**: 4 - コア機能
**依存**: #004, #008
**担当**: Backend Developer

## 目的
Conversationのステータス（NEW/WORKING/PENDING/RESOLVED/CLOSED/NO_ACTION_NEEDED）を変更できる機能を実装する。

## 受け入れ基準
- [ ] ステータス変更APIが実装されている
- [ ] 権限チェックが機能している（Agent/Adminのみ変更可）
- [ ] 楽観的ロックが実装されている（競合検知）
- [ ] ステータス変更が監査ログに記録される
- [ ] Inbox一覧でステータスが即座に反映される

## 実装詳細

### 1. ステータス更新API

#### `src/app/api/conversations/[id]/status/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAgentOrAdmin } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { Status } from '@prisma/client'
import { createAuditLog } from '@/lib/audit-service'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAgentOrAdmin(req)
  if (session instanceof NextResponse) {
    return session
  }

  const { status, version } = await req.json()

  if (!Object.values(Status).includes(status)) {
    return NextResponse.json(
      { error: 'Invalid status' },
      { status: 400 }
    )
  }

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

    // 楽観的ロック：versionチェック
    if (version !== undefined && current.version !== version) {
      return NextResponse.json(
        {
          error: 'Conversation was updated by another user',
          currentVersion: current.version,
        },
        { status: 409 }
      )
    }

    // ステータス更新
    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status,
        version: {
          increment: 1,
        },
      },
    })

    // 監査ログ記録
    await createAuditLog({
      conversationId,
      userId: session.user.id,
      action: 'STATUS_CHANGED',
      changes: {
        from: current.status,
        to: status,
      },
    })

    return NextResponse.json({ conversation: updated })
  } catch (error) {
    console.error('Status update error:', error)
    return NextResponse.json(
      { error: 'Failed to update status' },
      { status: 500 }
    )
  }
}
```

### 2. バルクステータス更新

#### `src/app/api/conversations/bulk-update/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAgentOrAdmin } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { Status } from '@prisma/client'

export async function POST(req: NextRequest) {
  const session = await requireAgentOrAdmin(req)
  if (session instanceof NextResponse) {
    return session
  }

  const { conversationIds, status } = await req.json()

  if (!Array.isArray(conversationIds) || conversationIds.length === 0) {
    return NextResponse.json(
      { error: 'conversationIds is required' },
      { status: 400 }
    )
  }

  if (!Object.values(Status).includes(status)) {
    return NextResponse.json(
      { error: 'Invalid status' },
      { status: 400 }
    )
  }

  try {
    // バルク更新
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

    return NextResponse.json({
      updated: result.count,
    })
  } catch (error) {
    console.error('Bulk update error:', error)
    return NextResponse.json(
      { error: 'Failed to bulk update' },
      { status: 500 }
    )
  }
}
```

### 3. ステータス遷移ロジック

#### `src/lib/status-service.ts`
```typescript
import { Status } from '@prisma/client'

// ステータス遷移の妥当性チェック
export function isValidStatusTransition(from: Status, to: Status): boolean {
  const transitions: Record<Status, Status[]> = {
    [Status.NEW]: [Status.WORKING, Status.NO_ACTION_NEEDED, Status.CLOSED],
    [Status.WORKING]: [Status.PENDING, Status.RESOLVED, Status.CLOSED],
    [Status.PENDING]: [Status.WORKING, Status.RESOLVED, Status.CLOSED],
    [Status.RESOLVED]: [Status.WORKING, Status.CLOSED],
    [Status.CLOSED]: [Status.WORKING], // 再オープン
    [Status.NO_ACTION_NEEDED]: [Status.WORKING, Status.CLOSED],
  }

  return transitions[from]?.includes(to) || false
}

// ステータス変更時の自動処理
export async function onStatusChange(
  conversationId: string,
  newStatus: Status
) {
  // RESOLVED → CLOSED の自動遷移（X日後）などをPhase 2で実装
  // SLA期限の設定などもここで実装
}
```

## テスト項目
- [ ] ステータスを変更できる
- [ ] versionが一致しない場合に409エラーが返る
- [ ] Viewerユーザーで変更すると403エラーが返る
- [ ] 無効なステータスで400エラーが返る
- [ ] 監査ログにステータス変更が記録される
- [ ] バルク更新が機能する

## 備考
- Phase 2 でステータス遷移ルールの厳格化
- Phase 2 で自動ステータス変更（SLA期限超過など）
