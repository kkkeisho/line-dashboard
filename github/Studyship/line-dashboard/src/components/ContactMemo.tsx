'use client'

import { useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'

interface Contact {
  id: string
  memo: string | null
}

interface ContactMemoProps {
  contact: Contact
  onUpdate: () => void
}

export function ContactMemo({ contact, onUpdate }: ContactMemoProps) {
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
