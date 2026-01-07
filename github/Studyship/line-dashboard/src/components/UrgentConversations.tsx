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

interface Conversation {
  id: string
  lastMessagePreview: string | null
  lastInboundAt: Date | null
  urgency: string
  priority: string
  contact: Contact
}

interface UrgentConversationsProps {
  conversations: Conversation[] | null
}

export function UrgentConversations({ conversations }: UrgentConversationsProps) {
  const urgencyLabels: Record<string, { label: string; color: string }> = {
    NOW: { label: '即対応', color: 'bg-red-600 text-white' },
    TODAY: { label: '当日中', color: 'bg-orange-600 text-white' },
    THIS_WEEK: { label: '今週中', color: 'bg-yellow-600 text-white' },
    ANYTIME: { label: 'いつでも', color: 'bg-gray-600 text-white' },
  }

  if (!conversations) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          緊急対応が必要
        </h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
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
          緊急対応が必要
        </h2>
        <div className="py-8 text-center text-gray-500">
          緊急対応が必要な会話はありません
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          緊急対応が必要
        </h2>
        <span className="text-sm text-gray-500">
          {conversations.length}件
        </span>
      </div>
      <div className="space-y-3">
        {conversations.map((conversation) => {
          const urgencyInfo = urgencyLabels[conversation.urgency] || {
            label: conversation.urgency,
            color: 'bg-gray-600 text-white',
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
                      className={`rounded px-2 py-0.5 text-xs font-medium ${urgencyInfo.color}`}
                    >
                      {urgencyInfo.label}
                    </span>
                  </div>
                  <p className="mb-1 truncate text-sm text-gray-600">
                    {conversation.lastMessagePreview || '(メッセージなし)'}
                  </p>
                  {conversation.lastInboundAt && (
                    <p className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(conversation.lastInboundAt), {
                        addSuffix: true,
                        locale: ja,
                      })}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
