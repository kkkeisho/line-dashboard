# #015 タグ管理機能

**優先度**: 中
**Phase**: 6 - 付加機能
**依存**: #002, #004
**担当**: Full-stack Developer

## 目的
Conversationにタグを付与し、タグで分類・フィルタできる機能を実装する。

## 受け入れ基準
- [ ] タグマスタの作成・削除ができる（Admin）
- [ ] Conversationにタグを付与・削除できる
- [ ] タグでフィルタできる
- [ ] タグが Inbox 一覧に表示される
- [ ] タグに色を設定できる

## 実装詳細

### 1. タグCRUD API

#### `src/app/api/tags/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAdmin } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

// タグ一覧取得
export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (session instanceof NextResponse) {
    return session
  }

  const tags = await prisma.tag.findMany({
    orderBy: {
      name: 'asc',
    },
  })

  return NextResponse.json({ tags })
}

// タグ作成（Admin only）
export async function POST(req: NextRequest) {
  const session = await requireAdmin(req)
  if (session instanceof NextResponse) {
    return session
  }

  const { name, color } = await req.json()

  if (!name) {
    return NextResponse.json(
      { error: 'Tag name is required' },
      { status: 400 }
    )
  }

  // 重複チェック
  const existing = await prisma.tag.findUnique({
    where: { name },
  })

  if (existing) {
    return NextResponse.json(
      { error: 'Tag already exists' },
      { status: 409 }
    )
  }

  const tag = await prisma.tag.create({
    data: {
      name,
      color: color || '#6B7280', // デフォルトグレー
    },
  })

  return NextResponse.json({ tag })
}
```

#### `src/app/api/tags/[id]/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

// タグ削除
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin(req)
  if (session instanceof NextResponse) {
    return session
  }

  await prisma.tag.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ success: true })
}

// タグ更新
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin(req)
  if (session instanceof NextResponse) {
    return session
  }

  const { name, color } = await req.json()

  const updated = await prisma.tag.update({
    where: { id: params.id },
    data: { name, color },
  })

  return NextResponse.json({ tag: updated })
}
```

### 2. Conversationへのタグ付与

#### `src/app/api/conversations/[id]/tags/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAgentOrAdmin } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

// タグ付与
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAgentOrAdmin(req)
  if (session instanceof NextResponse) {
    return session
  }

  const { tagId } = await req.json()
  const conversationId = params.id

  // Conversation取得
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  })

  if (!conversation) {
    return NextResponse.json(
      { error: 'Conversation not found' },
      { status: 404 }
    )
  }

  // タグ存在確認
  const tag = await prisma.tag.findUnique({
    where: { id: tagId },
  })

  if (!tag) {
    return NextResponse.json(
      { error: 'Tag not found' },
      { status: 404 }
    )
  }

  // 既に付与されている場合はスキップ
  const existing = await prisma.conversationTag.findFirst({
    where: {
      conversationId,
      tagId,
    },
  })

  if (existing) {
    return NextResponse.json({ success: true })
  }

  // タグ付与
  await prisma.conversationTag.create({
    data: {
      conversationId,
      contactId: conversation.contactId,
      tagId,
    },
  })

  return NextResponse.json({ success: true })
}

// タグ削除
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAgentOrAdmin(req)
  if (session instanceof NextResponse) {
    return session
  }

  const { searchParams } = new URL(req.url)
  const tagId = searchParams.get('tagId')

  await prisma.conversationTag.deleteMany({
    where: {
      conversationId: params.id,
      tagId: tagId!,
    },
  })

  return NextResponse.json({ success: true })
}
```

### 3. タグ管理UI（Admin）

#### `src/app/admin/tags/page.tsx`
```typescript
'use client'

import { useState, useEffect } from 'react'

export default function TagsManagementPage() {
  const [tags, setTags] = useState([])
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#6B7280')

  useEffect(() => {
    loadTags()
  }, [])

  async function loadTags() {
    const res = await fetch('/api/tags')
    const data = await res.json()
    setTags(data.tags)
  }

  async function createTag() {
    await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newTagName,
        color: newTagColor,
      }),
    })

    setNewTagName('')
    loadTags()
  }

  async function deleteTag(id: string) {
    if (!confirm('このタグを削除しますか？')) return

    await fetch(`/api/tags/${id}`, {
      method: 'DELETE',
    })

    loadTags()
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold">タグ管理</h1>

      {/* 新規作成 */}
      <div className="mb-8 rounded border bg-white p-4">
        <h2 className="mb-4 text-lg font-semibold">新規タグ作成</h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="タグ名"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            className="flex-1 rounded border p-2"
          />
          <input
            type="color"
            value={newTagColor}
            onChange={(e) => setNewTagColor(e.target.value)}
            className="h-10 w-20 rounded border"
          />
          <button
            onClick={createTag}
            className="rounded bg-blue-600 px-4 text-white hover:bg-blue-700"
          >
            作成
          </button>
        </div>
      </div>

      {/* タグ一覧 */}
      <div className="space-y-2">
        {tags.map((tag: any) => (
          <div
            key={tag.id}
            className="flex items-center justify-between rounded border bg-white p-3"
          >
            <div className="flex items-center gap-3">
              <div
                className="h-6 w-6 rounded"
                style={{ backgroundColor: tag.color }}
              />
              <span className="font-medium">{tag.name}</span>
            </div>
            <button
              onClick={() => deleteTag(tag.id)}
              className="text-red-600 hover:underline"
            >
              削除
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### 4. タグ選択UI（Conversation詳細）

#### `src/components/TagSelector.tsx`
```typescript
'use client'

import { useState, useEffect } from 'react'

export function TagSelector({ conversationId, selectedTags, onUpdate }) {
  const [allTags, setAllTags] = useState([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    loadTags()
  }, [])

  async function loadTags() {
    const res = await fetch('/api/tags')
    const data = await res.json()
    setAllTags(data.tags)
  }

  async function addTag(tagId: string) {
    await fetch(`/api/conversations/${conversationId}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagId }),
    })
    onUpdate()
  }

  async function removeTag(tagId: string) {
    await fetch(`/api/conversations/${conversationId}/tags?tagId=${tagId}`, {
      method: 'DELETE',
    })
    onUpdate()
  }

  return (
    <div>
      {/* 選択済みタグ */}
      <div className="mb-2 flex flex-wrap gap-1">
        {selectedTags.map((ct: any) => (
          <span
            key={ct.tag.id}
            className="flex items-center gap-1 rounded px-2 py-1 text-sm"
            style={{ backgroundColor: ct.tag.color, color: 'white' }}
          >
            {ct.tag.name}
            <button
              onClick={() => removeTag(ct.tag.id)}
              className="hover:opacity-70"
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {/* タグ追加 */}
      <button
        onClick={() => setOpen(!open)}
        className="text-sm text-blue-600 hover:underline"
      >
        + タグを追加
      </button>

      {open && (
        <div className="mt-2 space-y-1">
          {allTags
            .filter(
              (tag: any) =>
                !selectedTags.find((ct: any) => ct.tag.id === tag.id)
            )
            .map((tag: any) => (
              <button
                key={tag.id}
                onClick={() => addTag(tag.id)}
                className="block w-full rounded border p-2 text-left hover:bg-gray-100"
              >
                {tag.name}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
```

## テスト項目
- [ ] タグを作成できる（Admin）
- [ ] タグを削除できる（Admin）
- [ ] Conversationにタグを付与できる
- [ ] タグを削除できる
- [ ] タグでフィルタできる
- [ ] タグがInbox一覧に表示される

## 備考
- Phase 2 でタグの階層構造（親子関係）
- Phase 2 でタグの自動付与ルール
