'use client'

import Link from 'next/link'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Status, Priority, Urgency } from '@prisma/client'

interface Contact {
  id: string
  displayName: string
  pictureUrl: string | null
  isBlocked: boolean
  memo: string | null
}

interface User {
  id: string
  name: string
  email: string
}

interface Tag {
  id: string
  name: string
  color: string
}

interface ConversationTag {
  tag: Tag
}

interface Conversation {
  id: string
  status: Status
  priority: Priority
  urgency: Urgency
  isComplaint: boolean
  lastMessagePreview: string | null
  lastInboundAt: Date | null
  contact: Contact
  assignedUser: User | null
  tags: ConversationTag[]
}

interface ConversationListProps {
  conversations: Conversation[]
  loading: boolean
}

export function ConversationList({ conversations, loading }: ConversationListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        該当する会話がありません
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {conversations.map((conversation) => (
        <Link
          key={conversation.id}
          href={`/conversations/${conversation.id}`}
          className="block rounded-lg border bg-white p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              {/* プロフィール画像 */}
              {conversation.contact.pictureUrl ? (
                <Image
                  src={conversation.contact.pictureUrl}
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500 text-sm">
                    {conversation.contact.displayName.charAt(0)}
                  </span>
                </div>
              )}

              <div className="flex-1 min-w-0">
                {/* 顧客名 */}
                <div className="font-semibold text-gray-900">
                  {conversation.contact.displayName}
                </div>

                {/* メッセージプレビュー */}
                <div className="text-sm text-gray-600 truncate">
                  {conversation.lastMessagePreview || 'メッセージなし'}
                </div>

                {/* タグ */}
                {conversation.tags.length > 0 && (
                  <div className="mt-1 flex gap-1 flex-wrap">
                    {conversation.tags.map((ct) => (
                      <span
                        key={ct.tag.id}
                        className="rounded px-2 py-0.5 text-xs text-white"
                        style={{ backgroundColor: ct.tag.color }}
                      >
                        {ct.tag.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* メモアイコン表示 */}
                {conversation.contact.memo && (
                  <span
                    className="text-xs text-gray-500 mt-1 block"
                    title={conversation.contact.memo.substring(0, 100)}
                  >
                    📝 メモあり
                  </span>
                )}
              </div>
            </div>

            <div className="text-right ml-4 flex-shrink-0">
              {/* ステータス */}
              <StatusBadge status={conversation.status} />

              {/* 重要度・緊急度 */}
              <div className="mt-1 flex gap-1 text-xs justify-end">
                <PriorityBadge priority={conversation.priority} />
                <UrgencyBadge urgency={conversation.urgency} />
                {conversation.isComplaint && (
                  <span className="rounded bg-red-600 px-2 py-0.5 text-white">
                    クレーム
                  </span>
                )}
              </div>

              {/* 最終更新 */}
              {conversation.lastInboundAt && (
                <div className="mt-1 text-xs text-gray-500">
                  {formatDistanceToNow(new Date(conversation.lastInboundAt), {
                    addSuffix: true,
                    locale: ja,
                  })}
                </div>
              )}

              {/* 担当者 */}
              {conversation.assignedUser && (
                <div className="mt-1 text-xs text-gray-600">
                  {conversation.assignedUser.name}
                </div>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

function StatusBadge({ status }: { status: Status }) {
  const colors: Record<Status, string> = {
    NEW: 'bg-blue-100 text-blue-800',
    WORKING: 'bg-yellow-100 text-yellow-800',
    PENDING: 'bg-orange-100 text-orange-800',
    RESOLVED: 'bg-green-100 text-green-800',
    CLOSED: 'bg-gray-100 text-gray-800',
    NO_ACTION_NEEDED: 'bg-gray-100 text-gray-600',
  }

  const labels: Record<Status, string> = {
    NEW: '新規',
    WORKING: '対応中',
    PENDING: '保留',
    RESOLVED: '解決済み',
    CLOSED: 'クローズ',
    NO_ACTION_NEEDED: '対応不要',
  }

  return (
    <span className={`rounded px-2 py-1 text-xs ${colors[status]}`}>
      {labels[status]}
    </span>
  )
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const colors: Record<Priority, string> = {
    HIGH: 'bg-red-100 text-red-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    LOW: 'bg-green-100 text-green-800',
  }

  const labels: Record<Priority, string> = {
    HIGH: '高',
    MEDIUM: '中',
    LOW: '低',
  }

  return (
    <span className={`rounded px-2 py-0.5 ${colors[priority]}`}>
      {labels[priority]}
    </span>
  )
}

function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const colors: Record<Urgency, string> = {
    NOW: 'bg-red-100 text-red-800',
    TODAY: 'bg-orange-100 text-orange-800',
    THIS_WEEK: 'bg-yellow-100 text-yellow-800',
    ANYTIME: 'bg-gray-100 text-gray-800',
  }

  const labels: Record<Urgency, string> = {
    NOW: '即対応',
    TODAY: '今日中',
    THIS_WEEK: '今週中',
    ANYTIME: 'いつでも',
  }

  return (
    <span className={`rounded px-2 py-0.5 ${colors[urgency]}`}>
      {labels[urgency]}
    </span>
  )
}
