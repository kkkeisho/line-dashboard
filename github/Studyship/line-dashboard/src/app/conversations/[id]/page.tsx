'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { MessageTimeline } from '@/components/MessageTimeline'
import { ConversationSidebar } from '@/components/ConversationSidebar'
import { ReplyForm } from '@/components/ReplyForm'

interface Message {
  id: string
  direction: 'INBOUND' | 'OUTBOUND'
  text: string | null
  timestamp: string
}

interface Contact {
  id: string
  displayName: string
  pictureUrl: string | null
  lineUserId: string
  memo: string | null
}

interface Tag {
  id: string
  name: string
  color: string | null
}

interface ConversationTag {
  tag: Tag
}

interface User {
  id: string
  name: string
  email: string
}

interface Conversation {
  id: string
  status: string
  priority: string
  urgency: string
  isComplaint: boolean
  version: number
  contact: Contact
  assignedUser: User | null
  tags: ConversationTag[]
  messages: Message[]
}

export default function ConversationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const conversationId = params.id as string

  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadConversation()

    // ポーリング（5秒ごとに更新）
    const interval = setInterval(loadConversation, 5000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId])

  async function loadConversation() {
    try {
      const res = await fetch(`/api/conversations/${conversationId}`)

      if (!res.ok) {
        if (res.status === 404) {
          setError('会話が見つかりませんでした')
        } else if (res.status === 403) {
          setError('この会話にアクセスする権限がありません')
        } else {
          setError('会話の読み込みに失敗しました')
        }
        return
      }

      const data = await res.json()
      setConversation(data.conversation)
      setError(null)
    } catch (error) {
      console.error('Failed to load conversation:', error)
      setError('会話の読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    )
  }

  if (error || !conversation) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error || '会話が見つかりませんでした'}</div>
          <button
            onClick={() => router.push('/inbox')}
            className="text-blue-600 hover:underline"
          >
            Inboxに戻る
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* メインエリア */}
      <main className="flex flex-1 flex-col">
        {/* ヘッダー */}
        <header className="border-b bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/inbox')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← 戻る
            </button>

            {conversation.contact.pictureUrl && (
              <Image
                src={conversation.contact.pictureUrl}
                alt={conversation.contact.displayName}
                width={40}
                height={40}
                className="h-10 w-10 rounded-full"
              />
            )}

            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">
                {conversation.contact.displayName}
              </h1>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                    conversation.status === 'NEW'
                      ? 'bg-blue-100 text-blue-700'
                      : conversation.status === 'WORKING'
                      ? 'bg-yellow-100 text-yellow-700'
                      : conversation.status === 'RESOLVED'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {conversation.status}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* メッセージタイムライン */}
        <div className="flex-1 overflow-auto p-6">
          <MessageTimeline messages={conversation.messages} />
        </div>

        {/* 返信フォーム */}
        <div className="border-t bg-white p-4">
          <ReplyForm
            conversationId={conversationId}
            onSent={loadConversation}
          />
        </div>
      </main>

      {/* サイドバー */}
      <aside className="w-80 overflow-auto border-l bg-white p-6 shadow-sm">
        <ConversationSidebar
          conversation={conversation}
          onUpdate={loadConversation}
        />
      </aside>
    </div>
  )
}
