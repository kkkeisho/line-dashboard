# #011 Inbox一覧画面（リスト・フィルタ・検索）

**優先度**: 最高
**Phase**: 5 - UI実装
**依存**: #003, #008, #009, #010
**担当**: Frontend Developer

## 目的
会話一覧を表示し、フィルタ・検索・ソートができるInbox画面を実装する。

## 受け入れ基準
- [ ] Conversation一覧が表示される
- [ ] ステータス・担当者・重要度・緊急度でフィルタできる
- [ ] 顧客名で検索できる
- [ ] 未対応件数バッジが表示される
- [ ] ページネーションが機能する
- [ ] ローディング状態が表示される
- [ ] レスポンシブデザイン（モバイル対応）

## 実装詳細

### 1. Inbox画面レイアウト

#### `src/app/inbox/page.tsx`
```typescript
'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ConversationList } from '@/components/ConversationList'
import { InboxFilters } from '@/components/InboxFilters'
import { InboxStats } from '@/components/InboxStats'

export default function InboxPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    loadConversations()
    loadStats()
  }, [searchParams])

  async function loadConversations() {
    setLoading(true)
    try {
      const params = new URLSearchParams(searchParams.toString())
      const res = await fetch(`/api/conversations?${params}`)
      const data = await res.json()
      setConversations(data.conversations)
    } catch (error) {
      console.error('Failed to load conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadStats() {
    try {
      const res = await fetch('/api/conversations/stats')
      const data = await res.json()
      setStats(data)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  return (
    <div className="flex h-screen">
      {/* サイドバー */}
      <aside className="w-64 border-r bg-gray-50 p-4">
        <InboxStats stats={stats} />
        <InboxFilters />
      </aside>

      {/* メインエリア */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <h1 className="mb-4 text-2xl font-bold">Inbox</h1>
          <ConversationList
            conversations={conversations}
            loading={loading}
          />
        </div>
      </main>
    </div>
  )
}
```

### 2. Conversation リストコンポーネント

#### `src/components/ConversationList.tsx`
```typescript
'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'

export function ConversationList({ conversations, loading }) {
  if (loading) {
    return <div>Loading...</div>
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center text-gray-500">
        該当する会話がありません
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {conversations.map((conversation) => (
        <Link
          key={conversation.id}
          href={`/conversations/${conversation.id}`}
          className="block rounded-lg border bg-white p-4 hover:bg-gray-50"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {/* プロフィール画像 */}
              {conversation.contact.pictureUrl && (
                <img
                  src={conversation.contact.pictureUrl}
                  alt=""
                  className="h-10 w-10 rounded-full"
                />
              )}

              <div>
                {/* 顧客名 */}
                <div className="font-semibold">
                  {conversation.contact.displayName}
                </div>

                {/* メッセージプレビュー */}
                <div className="text-sm text-gray-600">
                  {conversation.lastMessagePreview}
                </div>

                {/* タグ */}
                <div className="mt-1 flex gap-1">
                  {conversation.tags.map((ct) => (
                    <span
                      key={ct.tag.id}
                      className="rounded bg-gray-200 px-2 py-0.5 text-xs"
                      style={{ backgroundColor: ct.tag.color }}
                    >
                      {ct.tag.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-right">
              {/* ステータス */}
              <StatusBadge status={conversation.status} />

              {/* 重要度・緊急度 */}
              <div className="mt-1 flex gap-1 text-xs">
                <PriorityBadge priority={conversation.priority} />
                <UrgencyBadge urgency={conversation.urgency} />
                {conversation.isComplaint && (
                  <span className="rounded bg-red-600 px-2 py-0.5 text-white">
                    クレーム
                  </span>
                )}
              </div>

              {/* 最終更新 */}
              <div className="mt-1 text-xs text-gray-500">
                {formatDistanceToNow(new Date(conversation.lastInboundAt), {
                  addSuffix: true,
                  locale: ja,
                })}
              </div>

              {/* 担当者 */}
              {conversation.assignedUser && (
                <div className="mt-1 text-xs text-gray-600">
                  {conversation.assignedUser.name}
                </div>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

function StatusBadge({ status }) {
  const colors = {
    NEW: 'bg-blue-100 text-blue-800',
    WORKING: 'bg-yellow-100 text-yellow-800',
    PENDING: 'bg-orange-100 text-orange-800',
    RESOLVED: 'bg-green-100 text-green-800',
    CLOSED: 'bg-gray-100 text-gray-800',
    NO_ACTION_NEEDED: 'bg-gray-100 text-gray-600',
  }

  const labels = {
    NEW: '新規',
    WORKING: '対応中',
    PENDING: '保留',
    RESOLVED: '解決済み',
    CLOSED: 'クローズ',
    NO_ACTION_NEEDED: '対応不要',
  }

  return (
    <span className={`rounded px-2 py-1 text-xs ${colors[status]}`}>
      {labels[status]}
    </span>
  )
}
```

### 3. フィルタコンポーネント

#### `src/components/InboxFilters.tsx`
```typescript
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Status, Priority, Urgency } from '@prisma/client'

export function InboxFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())

    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }

    router.push(`/inbox?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      {/* ステータスフィルタ */}
      <div>
        <label className="block text-sm font-medium">ステータス</label>
        <select
          className="mt-1 w-full rounded border p-2"
          value={searchParams.get('status') || ''}
          onChange={(e) => updateFilter('status', e.target.value)}
        >
          <option value="">全て</option>
          <option value={Status.NEW}>新規</option>
          <option value={Status.WORKING}>対応中</option>
          <option value={Status.PENDING}>保留</option>
          <option value={Status.RESOLVED}>解決済み</option>
        </select>
      </div>

      {/* 担当者フィルタ */}
      <div>
        <label className="block text-sm font-medium">担当者</label>
        <select
          className="mt-1 w-full rounded border p-2"
          value={searchParams.get('assignedUserId') || ''}
          onChange={(e) => updateFilter('assignedUserId', e.target.value)}
        >
          <option value="">全て</option>
          <option value="me">自分の担当</option>
          {/* ユーザー一覧はAPIから取得 */}
        </select>
      </div>

      {/* 検索 */}
      <div>
        <label className="block text-sm font-medium">検索</label>
        <input
          type="text"
          className="mt-1 w-full rounded border p-2"
          placeholder="顧客名を検索"
          value={searchParams.get('search') || ''}
          onChange={(e) => updateFilter('search', e.target.value)}
        />
      </div>
    </div>
  )
}
```

### 4. 統計表示

#### `src/components/InboxStats.tsx`
```typescript
export function InboxStats({ stats }) {
  if (!stats) {
    return null
  }

  return (
    <div className="mb-4 space-y-2">
      <div className="rounded bg-red-100 p-3">
        <div className="text-2xl font-bold text-red-600">
          {stats.needsActionCount}
        </div>
        <div className="text-sm text-red-800">未対応</div>
      </div>
    </div>
  )
}
```

## テスト項目
- [ ] Inbox画面が表示される
- [ ] Conversation一覧が表示される
- [ ] ステータスでフィルタできる
- [ ] 担当者でフィルタできる
- [ ] 検索が機能する
- [ ] 未対応件数バッジが表示される
- [ ] Conversationをクリックすると詳細画面に遷移する

## 備考
- Phase 2 で無限スクロール実装
- Phase 2 でリアルタイム更新（WebSocket）
