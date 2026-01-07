'use client'

import { useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'

interface ReplyFormProps {
  conversationId: string
  onSent?: () => void
}

export function ReplyForm({ conversationId, onSent }: ReplyFormProps) {
  const { canReply } = usePermissions()
  const [text, setText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!canReply) {
    return (
      <div className="rounded-md bg-gray-100 p-4 text-gray-500">
        返信権限がありません（閲覧のみ）
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!text.trim()) {
      setError('メッセージを入力してください')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/conversations/${conversationId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        const data = await response.json()

        // ステータスコードに応じた詳細なエラーメッセージ
        if (response.status === 403) {
          throw new Error('ユーザーがアカウントをブロックしています')
        } else if (response.status === 400) {
          throw new Error('メッセージの形式が不正です')
        } else {
          throw new Error(data.error || '返信の送信に失敗しました。再度お試しください')
        }
      }

      setText('')
      onSent?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : '返信の送信に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl + Enter で送信
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="reply-text" className="block text-sm font-medium text-gray-700">
          返信メッセージ
        </label>
        <textarea
          id="reply-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="メッセージを入力してください..."
          disabled={isSubmitting}
        />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          type="submit"
          disabled={isSubmitting || !text.trim()}
          className="inline-flex justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? '送信中...' : '返信を送信'}
        </button>

        <div className="text-xs text-gray-500">
          Cmd/Ctrl + Enter で送信
        </div>
      </div>
    </form>
  )
}
