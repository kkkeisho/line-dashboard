'use client'

import { useState, useEffect } from 'react'

interface Tag {
  id: string
  name: string
  color: string | null
}

interface ConversationTag {
  tag: Tag
}

interface TagSelectorProps {
  conversationId: string
  selectedTags: ConversationTag[]
  onUpdate: () => void
}

export function TagSelector({ conversationId, selectedTags, onUpdate }: TagSelectorProps) {
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadTags()
  }, [])

  async function loadTags() {
    try {
      const res = await fetch('/api/tags')
      if (!res.ok) {
        throw new Error('Failed to load tags')
      }
      const data = await res.json()
      setAllTags(data.tags)
    } catch (error) {
      console.error('Failed to load tags:', error)
    }
  }

  async function addTag(tagId: string) {
    if (loading) return

    try {
      setLoading(true)
      const res = await fetch(`/api/conversations/${conversationId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId }),
      })

      if (!res.ok) {
        throw new Error('Failed to add tag')
      }

      setOpen(false)
      onUpdate()
    } catch (error) {
      console.error('Failed to add tag:', error)
      alert('タグの追加に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  async function removeTag(tagId: string) {
    if (loading) return

    try {
      setLoading(true)
      const res = await fetch(`/api/conversations/${conversationId}/tags?tagId=${tagId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to remove tag')
      }

      onUpdate()
    } catch (error) {
      console.error('Failed to remove tag:', error)
      alert('タグの削除に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // 利用可能なタグ（まだ選択されていないタグ）
  const availableTags = allTags.filter(
    (tag) => !selectedTags.find((ct) => ct.tag.id === tag.id)
  )

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">タグ</label>

      {/* 選択済みタグ */}
      <div className="flex flex-wrap gap-2">
        {selectedTags.length === 0 ? (
          <span className="text-sm text-gray-400">タグなし</span>
        ) : (
          selectedTags.map((ct) => {
            const tagColor = ct.tag.color || '#6B7280'
            return (
              <span
                key={ct.tag.id}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm text-white"
                style={{ backgroundColor: tagColor }}
              >
              {ct.tag.name}
              <button
                onClick={() => removeTag(ct.tag.id)}
                disabled={loading}
                className="hover:opacity-70 disabled:cursor-not-allowed"
                aria-label="タグを削除"
              >
                ×
              </button>
              </span>
            )
          })
        )}
      </div>

      {/* タグ追加ボタン */}
      {availableTags.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            + タグを追加
          </button>

          {open && (
            <>
              {/* オーバーレイ */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setOpen(false)}
              />

              {/* ドロップダウン */}
              <div className="absolute left-0 z-20 mt-1 w-64 rounded-md border border-gray-200 bg-white shadow-lg">
                <div className="max-h-60 overflow-y-auto p-2">
                  {availableTags.map((tag) => {
                    const tagColor = tag.color || '#6B7280'
                    return (
                      <button
                        key={tag.id}
                        onClick={() => addTag(tag.id)}
                        disabled={loading}
                        className="flex w-full items-center gap-2 rounded p-2 text-left hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <div
                          className="h-4 w-4 rounded"
                          style={{ backgroundColor: tagColor }}
                        />
                        <span className="text-sm">{tag.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {availableTags.length === 0 && selectedTags.length > 0 && (
        <p className="text-xs text-gray-500">全てのタグが適用されています</p>
      )}
    </div>
  )
}
