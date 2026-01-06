# #008 Conversation管理ロジック

**優先度**: 最高
**Phase**: 4 - コア機能
**依存**: #002, #006
**担当**: Backend Developer

## 目的
会話（Conversation）の作成・取得・更新のコアロジックを実装する。

## 受け入れ基準
- [ ] Contact単位でConversationが自動作成される
- [ ] 既存のConversationを取得できる
- [ ] needs_action（要対応）判定ロジックが機能する
- [ ] Conversation一覧取得APIが実装されている
- [ ] フィルタ・ソート機能が実装されている

## 実装詳細

### 1. Conversation作成・取得

#### `src/lib/conversation-service.ts`
```typescript
import { prisma } from './prisma'
import { Status } from '@prisma/client'

export async function getOrCreateConversation(contactId: string) {
  // アクティブなConversationを取得
  let conversation = await prisma.conversation.findFirst({
    where: {
      contactId,
      status: {
        notIn: [Status.CLOSED],
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  })

  if (conversation) {
    return conversation
  }

  // 新規Conversation作成
  conversation = await prisma.conversation.create({
    data: {
      contactId,
      status: Status.NEW,
    },
  })

  return conversation
}

export async function getConversationById(id: string) {
  return await prisma.conversation.findUnique({
    where: { id },
    include: {
      contact: true,
      assignedUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      messages: {
        orderBy: {
          timestamp: 'asc',
        },
      },
      tags: {
        include: {
          tag: true,
        },
      },
    },
  })
}
```

### 2. Conversation一覧取得（フィルタ・ソート）

#### `src/app/api/conversations/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { Status, Priority, Urgency } from '@prisma/client'

export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (session instanceof NextResponse) {
    return session
  }

  const { searchParams } = new URL(req.url)

  // フィルタ条件
  const status = searchParams.get('status') as Status | null
  const assignedUserId = searchParams.get('assignedUserId')
  const priority = searchParams.get('priority') as Priority | null
  const urgency = searchParams.get('urgency') as Urgency | null
  const isComplaint = searchParams.get('isComplaint')
  const tagId = searchParams.get('tagId')
  const search = searchParams.get('search')

  // ページネーション
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = (page - 1) * limit

  // WHERE条件構築
  const where: any = {}

  if (status) {
    where.status = status
  }

  if (assignedUserId) {
    where.assignedUserId = assignedUserId
  }

  if (priority) {
    where.priority = priority
  }

  if (urgency) {
    where.urgency = urgency
  }

  if (isComplaint === 'true') {
    where.isComplaint = true
  }

  if (tagId) {
    where.tags = {
      some: {
        tagId,
      },
    }
  }

  if (search) {
    where.OR = [
      {
        contact: {
          displayName: {
            contains: search,
            mode: 'insensitive',
          },
        },
      },
      {
        contact: {
          memo: {
            contains: search,
            mode: 'insensitive',
          },
        },
      },
    ]
  }

  // 取得
  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      include: {
        contact: {
          select: {
            id: true,
            displayName: true,
            pictureUrl: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            name: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: [
        { urgency: 'asc' }, // NOW → TODAY → THIS_WEEK → ANYTIME
        { lastInboundAt: 'desc' },
      ],
      skip: offset,
      take: limit,
    }),
    prisma.conversation.count({ where }),
  ])

  return NextResponse.json({
    conversations,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}
```

### 3. needs_action 判定ロジック

#### `src/lib/conversation-service.ts`（更新）
```typescript
export function needsAction(conversation: any): boolean {
  // ステータスが対応不要またはクローズの場合は不要
  if (
    conversation.status === Status.NO_ACTION_NEEDED ||
    conversation.status === Status.CLOSED
  ) {
    return false
  }

  // 最終受信メッセージが最終送信メッセージより後の場合は要対応
  if (!conversation.lastInboundAt) {
    return false
  }

  if (!conversation.lastOutboundAt) {
    return true
  }

  return conversation.lastInboundAt > conversation.lastOutboundAt
}

// needs_actionでフィルタした一覧取得
export async function getNeedsActionConversations(limit = 50) {
  const conversations = await prisma.conversation.findMany({
    where: {
      status: {
        in: [Status.NEW, Status.WORKING, Status.PENDING],
      },
    },
    include: {
      contact: true,
      assignedUser: true,
      tags: {
        include: {
          tag: true,
        },
      },
    },
    orderBy: [
      { urgency: 'asc' },
      { lastInboundAt: 'desc' },
    ],
    take: limit,
  })

  // needs_actionでフィルタ
  return conversations.filter(needsAction)
}
```

### 4. Conversation統計API

#### `src/app/api/conversations/stats/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { Status } from '@prisma/client'

export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (session instanceof NextResponse) {
    return session
  }

  const stats = await prisma.conversation.groupBy({
    by: ['status'],
    _count: true,
  })

  const needsActionCount = await prisma.conversation.count({
    where: {
      status: {
        in: [Status.NEW, Status.WORKING, Status.PENDING],
      },
      OR: [
        { lastOutboundAt: null },
        {
          lastInboundAt: {
            gt: prisma.conversation.fields.lastOutboundAt,
          },
        },
      ],
    },
  })

  return NextResponse.json({
    stats,
    needsActionCount,
  })
}
```

## テスト項目
- [ ] 新規メッセージ受信時にConversationが作成される
- [ ] 既存のConversationが再利用される（重複作成されない）
- [ ] Conversation一覧APIが正しくフィルタされる
- [ ] needs_action判定が正しく機能する
- [ ] ソート順が正しい（Urgency → lastInboundAt）
- [ ] ページネーションが機能する

## 備考
- Phase 2 でConversationの自動クローズ機能を実装（X日間返信なし）
- Phase 2 でConversationのマージ機能を実装
