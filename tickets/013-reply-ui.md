# #013 返信UI・送信フォーム

**優先度**: 高
**Phase**: 5 - UI実装
**依存**: #004, #007
**担当**: Frontend Developer

## 目的
メッセージ返信フォームを実装し、LINEに送信できるようにする。

## 受け入れ基準
- [ ] 返信フォームが表示される
- [ ] テキスト入力・送信ができる
- [ ] 送信中の状態表示がある
- [ ] 送信エラー時にエラーメッセージが表示される
- [ ] 送信成功時にタイムラインに即座に反映される
- [ ] Viewerユーザーには返信フォームが表示されない

## 実装詳細

### 1. 返信フォームコンポーネント

#### `src/components/ReplyForm.tsx`
```typescript
'use client'

import { useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'

export function ReplyForm({ conversationId, onSent }) {
  const { canReply } = usePermissions()
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  if (!canReply) {
    return (
      <div className="rounded border border-gray-300 bg-gray-100 p-4 text-center text-gray-600">
        返信権限がありません（閲覧のみ）
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!text.trim()) {
      return
    }

    setSending(true)
    setError('')

    try {
      const res = await fetch(`/api/conversations/${conversationId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send message')
      }

      // 送信成功
      setText('')
      onSent()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {error && (
        <div className="rounded bg-red-100 p-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <textarea
          className="flex-1 rounded border p-2"
          rows={3}
          placeholder="メッセージを入力..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={sending}
          onKeyDown={(e) => {
            // Cmd/Ctrl + Enter で送信
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              handleSubmit(e)
            }
          }}
        />

        <div className="flex flex-col gap-2">
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
          >
            {sending ? '送信中...' : '送信'}
          </button>

          {/* テンプレートボタン（Phase 2） */}
          {/* <button
            type="button"
            className="rounded border px-4 py-2 hover:bg-gray-100"
          >
            テンプレート
          </button> */}
        </div>
      </div>

      <div className="text-xs text-gray-500">
        Cmd/Ctrl + Enter で送信
      </div>
    </form>
  )
}
```

### 2. 送信プレビュー（オプション）

#### `src/components/MessagePreview.tsx`
```typescript
'use client'

export function MessagePreview({ text, onSend, onCancel }) {
  return (
    <div className="rounded border bg-yellow-50 p-4">
      <div className="mb-2 text-sm font-medium">送信内容を確認</div>
      <div className="mb-4 whitespace-pre-wrap rounded bg-white p-3">
        {text}
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded border px-4 py-2 hover:bg-gray-100"
        >
          キャンセル
        </button>
        <button
          onClick={onSend}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          送信
        </button>
      </div>
    </div>
  )
}
```

### 3. テンプレート選択UI（Phase 2推奨だがMVPでも価値大）

#### `src/components/TemplateSelector.tsx`
```typescript
'use client'

import { useState, useEffect } from 'react'

export function TemplateSelector({ onSelect }) {
  const [templates, setTemplates] = useState([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (open) {
      loadTemplates()
    }
  }, [open])

  async function loadTemplates() {
    try {
      const res = await fetch('/api/templates')
      const data = await res.json()
      setTemplates(data.templates)
    } catch (error) {
      console.error('Failed to load templates:', error)
    }
  }

  function handleSelect(template: any) {
    onSelect(template.content)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="rounded border px-4 py-2 hover:bg-gray-100"
      >
        テンプレート
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 w-64 rounded border bg-white shadow-lg">
          <div className="max-h-64 overflow-auto">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => handleSelect(template)}
                className="block w-full p-3 text-left hover:bg-gray-100"
              >
                <div className="font-medium">{template.title}</div>
                <div className="text-sm text-gray-600">
                  {template.content.substring(0, 50)}...
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

### 4. エラーハンドリング

```typescript
// 送信エラー時の処理
if (res.status === 403) {
  setError('ユーザーがアカウントをブロックしています')
} else if (res.status === 400) {
  setError('メッセージの形式が不正です')
} else {
  setError('送信に失敗しました。再度お試しください')
}
```

## テスト項目
- [ ] 返信フォームが表示される
- [ ] テキストを入力して送信できる
- [ ] 送信後にフォームがクリアされる
- [ ] 送信中はボタンが無効化される
- [ ] Cmd/Ctrl + Enterで送信できる
- [ ] Viewerユーザーで閲覧のみメッセージが表示される
- [ ] 送信エラー時にエラーメッセージが表示される

## 備考
- Phase 2 でテンプレート選択機能を実装
- Phase 2 でリッチメッセージ（Flex Message）送信対応
- Phase 2 で下書き保存機能
