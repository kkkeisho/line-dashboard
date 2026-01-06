# #014 トリアージ（ルールベース）

**優先度**: 中
**Phase**: 6 - 付加機能
**依存**: #006, #008
**担当**: Backend Developer

## 目的
受信メッセージの内容から重要度・緊急度・クレームを自動判定するルールベースのトリアージ機能を実装する。

## 受け入れ基準
- [ ] キーワードベースのルールが実装されている
- [ ] 重要度（HIGH/MEDIUM/LOW）が自動判定される
- [ ] 緊急度（NOW/TODAY/THIS_WEEK/ANYTIME）が自動判定される
- [ ] クレームフラグが自動判定される
- [ ] 判定結果は人が手動で上書きできる
- [ ] ルール設定がコードで管理されている

## 実装詳細

### 1. トリアージルール定義

#### `src/lib/triage-rules.ts`
```typescript
import { Priority, Urgency } from '@prisma/client'

export interface TriageResult {
  priority: Priority
  urgency: Urgency
  isComplaint: boolean
  complaintType?: string
  confidence: number // 0.0 ~ 1.0
}

// クレーム判定キーワード
const COMPLAINT_KEYWORDS = [
  '最悪',
  '返金',
  '詐欺',
  '対応が悪い',
  'ひどい',
  '許せない',
  'クレーム',
  '謝罪',
  '責任者',
  '訴える',
  '消費者センター',
]

// 緊急度判定キーワード
const URGENCY_NOW_KEYWORDS = [
  '今すぐ',
  '至急',
  '緊急',
  '今日中',
  '当日',
  'すぐに',
]

const URGENCY_TODAY_KEYWORDS = [
  '今日',
  '本日',
  '急ぎ',
  'できるだけ早く',
]

// 重要度判定キーワード
const PRIORITY_HIGH_KEYWORDS = [
  '解約',
  '退会',
  '返金',
  '個人情報',
  '漏洩',
  '法的',
  '弁護士',
  '警察',
]

export function analyzeMessage(text: string): TriageResult {
  const lowerText = text.toLowerCase()

  // クレーム判定
  const isComplaint = COMPLAINT_KEYWORDS.some((keyword) =>
    lowerText.includes(keyword)
  )

  // 緊急度判定
  let urgency = Urgency.ANYTIME
  if (URGENCY_NOW_KEYWORDS.some((k) => lowerText.includes(k))) {
    urgency = Urgency.NOW
  } else if (URGENCY_TODAY_KEYWORDS.some((k) => lowerText.includes(k))) {
    urgency = Urgency.TODAY
  }

  // 重要度判定
  let priority = Priority.MEDIUM
  if (PRIORITY_HIGH_KEYWORDS.some((k) => lowerText.includes(k))) {
    priority = Priority.HIGH
  } else if (isComplaint) {
    priority = Priority.HIGH
  }

  // 信頼度計算（簡易版）
  let confidence = 0.5
  if (isComplaint || priority === Priority.HIGH) {
    confidence = 0.8
  }

  return {
    priority,
    urgency,
    isComplaint,
    confidence,
  }
}
```

### 2. トリアージ実行

#### `src/lib/triage-service.ts`
```typescript
import { prisma } from './prisma'
import { analyzeMessage } from './triage-rules'

export async function runTriage(conversationId: string, messageText: string) {
  const result = analyzeMessage(messageText)

  // Conversationを更新（既存の値が手動設定されていない場合のみ）
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  })

  if (!conversation) {
    return
  }

  // 手動設定されていない場合のみ自動判定を適用
  const updates: any = {}

  // 初回メッセージまたは既にMEDIUM/ANYTIMEの場合は上書き
  if (
    conversation.priority === 'MEDIUM' ||
    result.priority === 'HIGH'
  ) {
    updates.priority = result.priority
  }

  if (
    conversation.urgency === 'ANYTIME' ||
    result.urgency !== 'ANYTIME'
  ) {
    updates.urgency = result.urgency
  }

  if (result.isComplaint) {
    updates.isComplaint = true
  }

  if (Object.keys(updates).length > 0) {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: updates,
    })
  }

  // トリアージ提案を保存（Phase 2で実装）
  // await prisma.triageSuggestion.create({
  //   data: {
  //     conversationId,
  //     priority: result.priority,
  //     urgency: result.urgency,
  //     isComplaint: result.isComplaint,
  //     confidence: result.confidence,
  //   },
  // })
}
```

### 3. メッセージ受信時にトリアージ実行

#### `src/lib/line-handler.ts`（更新）
```typescript
import { runTriage } from './triage-service'

async function handleMessageEvent(event: MessageEvent) {
  // ... 既存の処理 ...

  // メッセージ保存後にトリアージ実行
  await runTriage(conversation.id, (message as TextMessage).text)
}
```

### 4. トリアージルール更新API（Admin用）

#### `src/app/api/admin/triage-rules/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req)
  if (session instanceof NextResponse) {
    return session
  }

  // ルール設定を返す
  return NextResponse.json({
    complaintKeywords: COMPLAINT_KEYWORDS,
    urgencyKeywords: {
      now: URGENCY_NOW_KEYWORDS,
      today: URGENCY_TODAY_KEYWORDS,
    },
    priorityKeywords: PRIORITY_HIGH_KEYWORDS,
  })
}

// Phase 2: ルール更新API実装
// export async function POST(req: NextRequest) { ... }
```

### 5. 手動上書き機能

#### `src/app/api/conversations/[id]/triage/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAgentOrAdmin } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { Priority, Urgency } from '@prisma/client'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAgentOrAdmin(req)
  if (session instanceof NextResponse) {
    return session
  }

  const { priority, urgency, isComplaint, complaintType } = await req.json()

  const updated = await prisma.conversation.update({
    where: { id: params.id },
    data: {
      priority,
      urgency,
      isComplaint,
      complaintType,
    },
  })

  return NextResponse.json({ conversation: updated })
}
```

## テスト項目
- [ ] クレームキーワードを含むメッセージでisComplaintがtrueになる
- [ ] 緊急キーワードを含むメッセージでurgencyがNOWになる
- [ ] 重要キーワードを含むメッセージでpriorityがHIGHになる
- [ ] 手動で上書きした値は自動判定で変更されない
- [ ] トリアージ結果がInbox一覧に反映される

## 備考
- Phase 2 でAI（OpenAI API等）による判定を実装
- Phase 2 でトリアージルールの管理画面を実装
- Phase 2 でトリアージ精度の可視化・改善
