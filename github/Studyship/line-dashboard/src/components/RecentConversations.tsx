'use client'

import Link from 'next/link'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'

interface Contact {
  id: string
  displayName: string
  pictureUrl: string | null
}

interface User {
  id: string
  name: string
  email: string
}

interface Conversation {
  id: string
  lastMessagePreview: string | null
  updatedAt: Date
  status: string
  contact: Contact
  assignedUser: User | null
}

interface RecentConversationsProps {
  conversations: Conversation[] | null
}

export function RecentConversations({ conversations }: RecentConversationsProps) {
  const statusLabels: Record<string, { label: string; color: string }> = {
    NEW: { label: '新規', color: 'bg-blue-100 text-blue-800' },
    WORKING: { label: '対応中', color: 'bg-yellow-100 text-yellow-800' },
    PENDING: { label: '保留', color: 'bg-orange-100 text-orange-800' },
    RESOLVED: { label: '解決済み', color: 'bg-green-100 text-green-800' },
    CLOSED: { label: 'クローズ', color: 'bg-gray-100 text-gray-800' },
    NO_ACTION_NEEDED: { label: '対応不要', color: 'bg-purple-100 text-purple-800' },
  }

  if (!conversations) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          最近の会話
        </h2>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded bg-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          最近の会話
        </h2>
        <div className="py-8 text-center text-gray-500">
          会話がありません
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          最近の会話
        </h2>
        <Link
          href="/inbox"
          className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
        >
          すべて見る
        </Link>
      </div>
      <div className="space-y-3">
        {conversations.map((conversation) => {
          const statusInfo = statusLabels[conversation.status] || {
            label: conversation.status,
            color: 'bg-gray-100 text-gray-800',
          }

          return (
            <Link
              key={conversation.id}
              href={`/conversations/${conversation.id}`}
              className="block rounded-lg border border-gray-100 p-4 transition-all hover:border-gray-300 hover:bg-gray-50"
            >
              <div className="flex items-start gap-3">
                {/* プロフィール画像 */}
                <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-gray-200">
                  {conversation.contact.pictureUrl ? (
                    <Image
                      src={conversation.contact.pictureUrl}
                      alt={conversation.contact.displayName}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-gray-600">
                      {conversation.contact.displayName.charAt(0)}
                    </div>
                  )}
                </div>

                {/* 会話情報 */}
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {conversation.contact.displayName}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${statusInfo.color}`}
                    >
                      {statusInfo.label}
                    </span>
                  </div>
                  <p className="mb-1 truncate text-sm text-gray-600">
                    {conversation.lastMessagePreview || '(メッセージなし)'}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>
                      {formatDistanceToNow(new Date(conversation.updatedAt), {
                        addSuffix: true,
                        locale: ja,
                      })}
                    </span>
                    {conversation.assignedUser && (
                      <>
                        <span>•</span>
                        <span>{conversation.assignedUser.name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
