# #007 メッセージ送信機能

**優先度**: 最高
**Phase**: 3 - LINE連携
**依存**: #002, #004, #006
**担当**: Backend Developer

## 目的
ダッシュボードからLINEユーザーにメッセージを送信できる機能を実装する。

## 受け入れ基準
- [ ] APIエンドポイントからメッセージ送信ができる
- [ ] 送信メッセージがmessagesテーブルに記録される
- [ ] 送信権限（Agent/Admin）がチェックされる
- [ ] LINEに実際にメッセージが届く
- [ ] 送信エラー時に適切なエラーメッセージが返る
- [ ] 送信内容が監査ログに記録される

## 実装詳細

### 1. メッセージ送信API

#### `src/app/api/conversations/[id]/reply/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAgentOrAdmin } from '@/lib/api-auth'
import { sendMessage } from '@/lib/message-service'
import { createAuditLog } from '@/lib/audit-service'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // 権限チェック
  const session = await requireAgentOrAdmin(req)
  if (session instanceof NextResponse) {
    return session
  }

  const { text } = await req.json()

  if (!text || text.trim().length === 0) {
    return NextResponse.json(
      { error: 'Message text is required' },
      { status: 400 }
    )
  }

  try {
    const conversationId = params.id

    // Conversation取得
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { contact: true },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    if (conversation.contact.isBlocked) {
      return NextResponse.json(
        { error: 'User has blocked the account' },
        { status: 400 }
      )
    }

    // メッセージ送信
    const message = await sendMessage(
      conversationId,
      conversation.contact.lineUserId,
      text
    )

    // 監査ログ記録
    await createAuditLog({
      conversationId,
      userId: session.user.id,
      action: 'REPLY_SENT',
      changes: { text },
    })

    return NextResponse.json({ success: true, message })
  } catch (error) {
    console.error('Reply error:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
```

### 2. メッセージ送信サービス

#### `src/lib/message-service.ts`（更新）
```typescript
import { lineClient } from './line'
import { prisma } from './prisma'
import { Direction } from '@prisma/client'

export async function sendMessage(
  conversationId: string,
  lineUserId: string,
  text: string
) {
  try {
    // LINEに送信
    const result = await lineClient.pushMessage(lineUserId, {
      type: 'text',
      text,
    })

    // DBに保存
    const message = await prisma.message.create({
      data: {
        conversationId,
        direction: Direction.OUTBOUND,
        text,
        timestamp: new Date(),
      },
    })

    // Conversation更新
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastOutboundAt: new Date(),
        lastMessagePreview: text.substring(0, 100),
        updatedAt: new Date(),
      },
    })

    return message
  } catch (error) {
    console.error('Failed to send message:', error)
    throw new Error('Message send failed')
  }
}

// リトライ機能付き送信（Phase 2推奨）
export async function sendMessageWithRetry(
  conversationId: string,
  lineUserId: string,
  text: string,
  maxRetries = 3
) {
  let lastError: any

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await sendMessage(conversationId, lineUserId, text)
    } catch (error) {
      lastError = error
      console.error(`Send attempt ${attempt} failed:`, error)

      if (attempt < maxRetries) {
        // 指数バックオフ
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        )
      }
    }
  }

  throw lastError
}
```

### 3. 監査ログサービス

#### `src/lib/audit-service.ts`
```typescript
import { prisma } from './prisma'

interface AuditLogData {
  conversationId?: string
  userId: string
  action: string
  changes?: any
  ipAddress?: string
  userAgent?: string
}

export async function createAuditLog(data: AuditLogData) {
  return await prisma.auditLog.create({
    data: {
      conversationId: data.conversationId,
      userId: data.userId,
      action: data.action,
      changes: data.changes || {},
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    },
  })
}
```

### 4. エラーハンドリング

#### `src/lib/errors.ts`
```typescript
export class MessageSendError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'MessageSendError'
  }
}

export function handleLineSendError(error: any): MessageSendError {
  if (error.statusCode === 400) {
    return new MessageSendError(
      'Invalid request',
      'INVALID_REQUEST',
      400
    )
  }

  if (error.statusCode === 403) {
    return new MessageSendError(
      'User has blocked the account',
      'USER_BLOCKED',
      403
    )
  }

  return new MessageSendError(
    'Failed to send message',
    'SEND_FAILED',
    500
  )
}
```

### 5. レート制限対策（Phase 2推奨）

#### `src/lib/rate-limiter.ts`
```typescript
// Redis等を使ったレート制限実装
// LINEのAPI制限に応じて調整
// 例：1秒あたり100リクエストまで
```

## テスト項目
- [ ] APIから返信を送信し、LINEに届く
- [ ] 送信メッセージがmessagesテーブルに保存される
- [ ] lastOutboundAtが更新される
- [ ] Viewerユーザーで送信すると403エラーが返る
- [ ] 空のメッセージを送信すると400エラーが返る
- [ ] ブロックしたユーザーに送信すると適切なエラーが返る
- [ ] 監査ログに送信記録が残る

## 備考
- Phase 2 でテンプレート機能を実装
- Phase 2 で送信予約機能を実装
- Phase 2 でリッチメッセージ（Flex Message等）対応
