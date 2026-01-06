# #016 内部メモ機能

**優先度**: 中
**Phase**: 6 - 付加機能
**依存**: #002, #004
**担当**: Full-stack Developer

## 目的
Contactに内部メモを記入し、チーム内で情報共有できる機能を実装する。

## 受け入れ基準
- [ ] Contact単位でメモを記入・編集できる
- [ ] メモは顧客に見えない（社内のみ）
- [ ] メモで検索できる
- [ ] メモ編集履歴が監査ログに記録される

## 実装詳細

### 1. メモ更新API

#### `src/app/api/contacts/[id]/memo/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAgentOrAdmin } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit-service'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAgentOrAdmin(req)
  if (session instanceof NextResponse) {
    return session
  }

  const { memo } = await req.json()
  const contactId = params.id

  // 現在の値取得
  const current = await prisma.contact.findUnique({
    where: { id: contactId },
  })

  if (!current) {
    return NextResponse.json(
      { error: 'Contact not found' },
      { status: 404 }
    )
  }

  // メモ更新
  const updated = await prisma.contact.update({
    where: { id: contactId },
    data: { memo },
  })

  // 監査ログ記録
  await createAuditLog({
    userId: session.user.id,
    action: 'MEMO_UPDATED',
    changes: {
      contactId,
      from: current.memo,
      to: memo,
    },
  })

  return NextResponse.json({ contact: updated })
}
```

### 2. メモ表示・編集UI

#### `src/components/ContactMemo.tsx`
```typescript
'use client'

import { useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'

export function ContactMemo({ contact, onUpdate }) {
  const { canUpdateStatus } = usePermissions()
  const [editing, setEditing] = useState(false)
  const [memo, setMemo] = useState(contact.memo || '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await fetch(`/api/contacts/${contact.id}/memo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memo }),
      })
      setEditing(false)
      onUpdate()
    } catch (error) {
      console.error('Failed to save memo:', error)
    } finally {
      setSaving(false)
    }
  }

  if (!canUpdateStatus) {
    // 閲覧のみ
    return (
      <div>
        <label className="block text-sm font-medium">内部メモ</label>
        <div className="mt-1 whitespace-pre-wrap rounded border bg-gray-50 p-3 text-sm">
          {contact.memo || 'メモがありません'}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium">内部メモ</label>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-blue-600 hover:underline"
          >
            編集
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-1">
          <textarea
            className="w-full rounded border p-2"
            rows={6}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="内部メモを入力..."
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
            >
              {saving ? '保存中...' : '保存'}
            </button>
            <button
              onClick={() => {
                setMemo(contact.memo || '')
                setEditing(false)
              }}
              className="rounded border px-4 py-2 hover:bg-gray-100"
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-1 whitespace-pre-wrap rounded border bg-gray-50 p-3 text-sm">
          {contact.memo || 'メモがありません'}
        </div>
      )}
    </div>
  )
}
```

### 3. メモ検索

既に #008 で実装済み：
```typescript
// GET /api/conversations?search=xxx
// メモも検索対象に含まれる
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
```

### 4. メモプレビュー（Inbox一覧）

#### `src/components/ConversationList.tsx`（更新）
```typescript
{/* メモアイコン表示 */}
{conversation.contact.memo && (
  <span
    className="text-xs text-gray-500"
    title={conversation.contact.memo.substring(0, 100)}
  >
    📝 メモあり
  </span>
)}
```

## テスト項目
- [ ] メモを記入・編集できる
- [ ] メモが保存される
- [ ] メモで検索できる
- [ ] Viewerユーザーでメモは閲覧のみ
- [ ] メモ編集が監査ログに記録される

## 備考
- Phase 2 でメモのバージョン管理（編集履歴）
- Phase 2 でメモへの @メンション機能
- Phase 2 でメモのリッチテキスト対応
