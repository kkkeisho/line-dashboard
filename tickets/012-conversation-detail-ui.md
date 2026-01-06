# #012 Conversation詳細画面

**優先度**: 最高
**Phase**: 5 - UI実装
**依存**: #008, #009, #010
**担当**: Frontend Developer

## 目的
会話の詳細（メッセージ履歴、顧客情報、ステータス・担当変更UI）を表示する画面を実装する。

## 受け入れ基準
- [ ] メッセージタイムラインが表示される
- [ ] 送受信メッセージが区別されて表示される
- [ ] 顧客情報（名前、プロフィール画像、タグ、メモ）が表示される
- [ ] ステータス・担当者を変更できる
- [ ] トリアージ情報（重要度・緊急度・クレーム）を編集できる
- [ ] リアルタイムで新着メッセージが反映される（ポーリング or WebSocket）

## 実装詳細

### 1. 詳細画面レイアウト

#### `src/app/conversations/[id]/page.tsx`
```typescript
'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { MessageTimeline } from '@/components/MessageTimeline'
import { ConversationSidebar } from '@/components/ConversationSidebar'
import { ReplyForm } from '@/components/ReplyForm'

export default function ConversationDetailPage() {
  const params = useParams()
  const conversationId = params.id as string

  const [conversation, setConversation] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadConversation()

    // ポーリング（5秒ごとに更新）
    const interval = setInterval(loadConversation, 5000)
    return () => clearInterval(interval)
  }, [conversationId])

  async function loadConversation() {
    try {
      const res = await fetch(`/api/conversations/${conversationId}`)
      const data = await res.json()
      setConversation(data.conversation)
    } catch (error) {
      console.error('Failed to load conversation:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (!conversation) {
    return <div>Conversation not found</div>
  }

  return (
    <div className="flex h-screen">
      {/* メインエリア */}
      <main className="flex flex-1 flex-col">
        {/* ヘッダー */}
        <header className="border-b p-4">
          <div className="flex items-center gap-3">
            {conversation.contact.pictureUrl && (
              <img
                src={conversation.contact.pictureUrl}
                alt=""
                className="h-10 w-10 rounded-full"
              />
            )}
            <div>
              <h1 className="text-xl font-bold">
                {conversation.contact.displayName}
              </h1>
              <div className="text-sm text-gray-600">
                {conversation.contact.lineUserId}
              </div>
            </div>
          </div>
        </header>

        {/* メッセージタイムライン */}
        <div className="flex-1 overflow-auto p-4">
          <MessageTimeline messages={conversation.messages} />
        </div>

        {/* 返信フォーム */}
        <div className="border-t p-4">
          <ReplyForm
            conversationId={conversationId}
            onSent={loadConversation}
          />
        </div>
      </main>

      {/* サイドバー */}
      <aside className="w-80 border-l bg-gray-50 p-4">
        <ConversationSidebar
          conversation={conversation}
          onUpdate={loadConversation}
        />
      </aside>
    </div>
  )
}
```

### 2. メッセージタイムライン

#### `src/components/MessageTimeline.tsx`
```typescript
'use client'

import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Direction } from '@prisma/client'

export function MessageTimeline({ messages }) {
  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${
            message.direction === Direction.OUTBOUND
              ? 'justify-end'
              : 'justify-start'
          }`}
        >
          <div
            className={`max-w-md rounded-lg p-3 ${
              message.direction === Direction.OUTBOUND
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-900'
            }`}
          >
            <div className="whitespace-pre-wrap">{message.text}</div>
            <div
              className={`mt-1 text-xs ${
                message.direction === Direction.OUTBOUND
                  ? 'text-blue-100'
                  : 'text-gray-600'
              }`}
            >
              {format(new Date(message.timestamp), 'MM/dd HH:mm', {
                locale: ja,
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
```

### 3. サイドバー（顧客情報・編集）

#### `src/components/ConversationSidebar.tsx`
```typescript
'use client'

import { useState } from 'react'
import { Status, Priority, Urgency } from '@prisma/client'

export function ConversationSidebar({ conversation, onUpdate }) {
  const [editing, setEditing] = useState(false)

  async function updateStatus(status: Status) {
    try {
      await fetch(`/api/conversations/${conversation.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, version: conversation.version }),
      })
      onUpdate()
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  async function updateAssignment(assignedUserId: string) {
    try {
      await fetch(`/api/conversations/${conversation.id}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedUserId }),
      })
      onUpdate()
    } catch (error) {
      console.error('Failed to update assignment:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* ステータス */}
      <div>
        <label className="block text-sm font-medium">ステータス</label>
        <select
          className="mt-1 w-full rounded border p-2"
          value={conversation.status}
          onChange={(e) => updateStatus(e.target.value as Status)}
        >
          <option value={Status.NEW}>新規</option>
          <option value={Status.WORKING}>対応中</option>
          <option value={Status.PENDING}>保留</option>
          <option value={Status.RESOLVED}>解決済み</option>
          <option value={Status.CLOSED}>クローズ</option>
          <option value={Status.NO_ACTION_NEEDED}>対応不要</option>
        </select>
      </div>

      {/* 担当者 */}
      <div>
        <label className="block text-sm font-medium">担当者</label>
        <select
          className="mt-1 w-full rounded border p-2"
          value={conversation.assignedUserId || ''}
          onChange={(e) => updateAssignment(e.target.value)}
        >
          <option value="">未割当</option>
          {/* ユーザー一覧 */}
        </select>
      </div>

      {/* トリアージ情報 */}
      <div className="space-y-2">
        <div>
          <label className="block text-sm font-medium">重要度</label>
          <select className="mt-1 w-full rounded border p-2">
            <option>HIGH</option>
            <option>MEDIUM</option>
            <option>LOW</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">緊急度</label>
          <select className="mt-1 w-full rounded border p-2">
            <option>NOW</option>
            <option>TODAY</option>
            <option>THIS_WEEK</option>
            <option>ANYTIME</option>
          </select>
        </div>
        <div>
          <label className="flex items-center gap-2">
            <input type="checkbox" />
            <span className="text-sm font-medium">クレーム</span>
          </label>
        </div>
      </div>

      {/* メモ */}
      <div>
        <label className="block text-sm font-medium">内部メモ</label>
        <textarea
          className="mt-1 w-full rounded border p-2"
          rows={4}
          placeholder="内部メモを入力..."
          value={conversation.contact.memo || ''}
        />
      </div>

      {/* タグ */}
      <div>
        <label className="block text-sm font-medium">タグ</label>
        <div className="mt-1 flex flex-wrap gap-1">
          {conversation.tags.map((ct) => (
            <span
              key={ct.tag.id}
              className="rounded bg-gray-200 px-2 py-1 text-sm"
            >
              {ct.tag.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
```

## テスト項目
- [ ] メッセージタイムラインが表示される
- [ ] 送信メッセージと受信メッセージが区別される
- [ ] ステータスを変更できる
- [ ] 担当者を変更できる
- [ ] 新着メッセージが自動的に反映される（ポーリング）
- [ ] 顧客情報が表示される

## 備考
- Phase 2 でWebSocketによるリアルタイム更新
- Phase 2 でメッセージの既読管理
