# #017 監査ログ機能

**優先度**: 中
**Phase**: 7 - 管理・監査
**依存**: #002, #004
**担当**: Backend Developer

## 目的
全ての重要な操作を監査ログに記録し、Admin が閲覧できる機能を実装する。

## 受け入れ基準
- [ ] 監査ログがデータベースに記録される
- [ ] 監査ログ閲覧APIが実装されている（Admin only）
- [ ] 監査ログ閲覧画面が実装されている
- [ ] 以下の操作がログに記録される：
  - 返信送信
  - ステータス変更
  - 担当者アサイン
  - トリアージ変更
  - メモ編集
  - ユーザー作成・削除

## 実装詳細

### 1. 監査ログ記録（既に実装済み）

#### `src/lib/audit-service.ts`
```typescript
import { prisma } from './prisma'

export interface AuditLogData {
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

// リクエストから IP/User-Agent を取得するヘルパー
export function getRequestMetadata(req: Request) {
  return {
    ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
    userAgent: req.headers.get('user-agent') || 'unknown',
  }
}
```

### 2. 監査ログ閲覧API

#### `src/app/api/audit-logs/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req)
  if (session instanceof NextResponse) {
    return session
  }

  const { searchParams } = new URL(req.url)

  // フィルタ
  const conversationId = searchParams.get('conversationId')
  const userId = searchParams.get('userId')
  const action = searchParams.get('action')

  // ページネーション
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '100')
  const offset = (page - 1) * limit

  // WHERE条件
  const where: any = {}

  if (conversationId) {
    where.conversationId = conversationId
  }

  if (userId) {
    where.userId = userId
  }

  if (action) {
    where.action = action
  }

  // 取得
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        conversation: {
          select: {
            id: true,
            contact: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: offset,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ])

  return NextResponse.json({
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}
```

### 3. 監査ログ閲覧画面

#### `src/app/admin/audit-logs/page.tsx`
```typescript
'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    loadLogs()
  }, [page])

  async function loadLogs() {
    setLoading(true)
    try {
      const res = await fetch(`/api/audit-logs?page=${page}`)
      const data = await res.json()
      setLogs(data.logs)
    } catch (error) {
      console.error('Failed to load logs:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold">監査ログ</h1>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">日時</th>
              <th className="border p-2 text-left">ユーザー</th>
              <th className="border p-2 text-left">操作</th>
              <th className="border p-2 text-left">会話</th>
              <th className="border p-2 text-left">変更内容</th>
              <th className="border p-2 text-left">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log: any) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="border p-2 text-sm">
                  {format(new Date(log.createdAt), 'yyyy/MM/dd HH:mm:ss', {
                    locale: ja,
                  })}
                </td>
                <td className="border p-2">
                  <div className="font-medium">{log.user.name}</div>
                  <div className="text-xs text-gray-600">{log.user.email}</div>
                </td>
                <td className="border p-2">
                  <ActionBadge action={log.action} />
                </td>
                <td className="border p-2">
                  {log.conversation ? (
                    <a
                      href={`/conversations/${log.conversation.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {log.conversation.contact.displayName}
                    </a>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="border p-2">
                  <pre className="text-xs">
                    {JSON.stringify(log.changes, null, 2)}
                  </pre>
                </td>
                <td className="border p-2 text-xs text-gray-600">
                  {log.ipAddress}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ページネーション */}
      <div className="mt-4 flex justify-center gap-2">
        <button
          onClick={() => setPage(page - 1)}
          disabled={page === 1}
          className="rounded border px-4 py-2 disabled:opacity-50"
        >
          前へ
        </button>
        <span className="px-4 py-2">ページ {page}</span>
        <button
          onClick={() => setPage(page + 1)}
          className="rounded border px-4 py-2"
        >
          次へ
        </button>
      </div>
    </div>
  )
}

function ActionBadge({ action }: { action: string }) {
  const labels: Record<string, { label: string; color: string }> = {
    REPLY_SENT: { label: '返信送信', color: 'bg-blue-100 text-blue-800' },
    STATUS_CHANGED: {
      label: 'ステータス変更',
      color: 'bg-yellow-100 text-yellow-800',
    },
    ASSIGNED: { label: '担当変更', color: 'bg-green-100 text-green-800' },
    SELF_ASSIGNED: {
      label: '自己アサイン',
      color: 'bg-green-100 text-green-800',
    },
    MEMO_UPDATED: { label: 'メモ更新', color: 'bg-purple-100 text-purple-800' },
  }

  const config = labels[action] || {
    label: action,
    color: 'bg-gray-100 text-gray-800',
  }

  return (
    <span className={`rounded px-2 py-1 text-xs ${config.color}`}>
      {config.label}
    </span>
  )
}
```

### 4. Conversation詳細での履歴表示

#### `src/components/ConversationHistory.tsx`
```typescript
'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export function ConversationHistory({ conversationId }) {
  const [logs, setLogs] = useState([])

  useEffect(() => {
    loadLogs()
  }, [conversationId])

  async function loadLogs() {
    try {
      const res = await fetch(
        `/api/audit-logs?conversationId=${conversationId}`
      )
      const data = await res.json()
      setLogs(data.logs)
    } catch (error) {
      console.error('Failed to load logs:', error)
    }
  }

  return (
    <div>
      <h3 className="mb-2 text-sm font-medium">変更履歴</h3>
      <div className="space-y-2">
        {logs.map((log: any) => (
          <div key={log.id} className="text-xs text-gray-600">
            <div>
              {format(new Date(log.createdAt), 'MM/dd HH:mm', { locale: ja })}
            </div>
            <div>
              {log.user.name}: {log.action}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

## テスト項目
- [ ] 返信送信時に監査ログが記録される
- [ ] ステータス変更時に監査ログが記録される
- [ ] 監査ログ一覧が表示される（Admin）
- [ ] Agent/Viewerは監査ログにアクセスできない（403）
- [ ] Conversationでフィルタできる
- [ ] ユーザーでフィルタできる

## 備考
- Phase 2 でログのエクスポート機能（CSV）
- Phase 2 でログの保持期間設定・自動削除
- Phase 2 でログの詳細検索・分析機能
