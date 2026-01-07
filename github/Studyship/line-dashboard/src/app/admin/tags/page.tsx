'use client'

import { useState, useEffect } from 'react'

interface Tag {
  id: string
  name: string
  color: string
}

export default function TagsManagementPage() {
  const [tags, setTags] = useState<Tag[]>([])
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#6B7280')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadTags()
  }, [])

  async function loadTags() {
    try {
      setLoading(true)
      const res = await fetch('/api/tags')
      if (!res.ok) {
        throw new Error('Failed to load tags')
      }
      const data = await res.json()
      setTags(data.tags)
      setError(null)
    } catch (err) {
      setError('タグの読み込みに失敗しました')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function createTag() {
    if (!newTagName.trim()) {
      alert('タグ名を入力してください')
      return
    }

    try {
      setCreating(true)
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTagName.trim(),
          color: newTagColor,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create tag')
      }

      setNewTagName('')
      setNewTagColor('#6B7280')
      await loadTags()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'タグの作成に失敗しました')
    } finally {
      setCreating(false)
    }
  }

  async function deleteTag(id: string) {
    if (!confirm('このタグを削除しますか？関連する会話からもタグが削除されます。')) {
      return
    }

    try {
      const res = await fetch(`/api/tags/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to delete tag')
      }

      await loadTags()
    } catch (err) {
      alert('タグの削除に失敗しました')
      console.error(err)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">タグ管理</h1>
        <p className="mt-1 text-sm text-gray-600">
          会話の分類に使用するタグの作成・削除を行います
        </p>
      </div>

      {error && (
        <div className="mt-6 mb-4 rounded-md bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {/* 新規作成 */}
      <div className="mt-6 mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">新規タグ作成</h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="タグ名"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  createTag()
                }
              }}
              className="flex-1 rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={creating}
            />
            <input
              type="color"
              value={newTagColor}
              onChange={(e) => setNewTagColor(e.target.value)}
              className="h-10 w-20 cursor-pointer rounded-md border border-gray-300"
              disabled={creating}
            />
            <button
              onClick={createTag}
              disabled={creating || !newTagName.trim()}
              className="rounded-lg bg-blue-600 px-6 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? '作成中...' : '作成'}
            </button>
          </div>
        </div>

      {/* タグ一覧 */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold">
            タグ一覧 ({tags.length}件)
          </h2>
        </div>
        <div className="divide-y">
          {tags.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              タグが登録されていません
            </div>
          ) : (
            tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center justify-between p-4 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-8 w-8 rounded"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="font-medium">{tag.name}</span>
                </div>
                <button
                  onClick={() => deleteTag(tag.id)}
                  className="text-sm text-red-600 hover:text-red-800 hover:underline"
                >
                  削除
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
