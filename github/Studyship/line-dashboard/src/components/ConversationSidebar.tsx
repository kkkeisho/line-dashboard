'use client'

import { useState } from 'react'
import { TagSelector } from '@/components/TagSelector'
import { ConversationHistory } from '@/components/ConversationHistory'

interface Contact {
  id: string
  displayName: string
  pictureUrl: string | null
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
}

interface ConversationSidebarProps {
  conversation: Conversation
  onUpdate: () => void
}

export function ConversationSidebar({
  conversation,
  onUpdate,
}: ConversationSidebarProps) {
  const [memo, setMemo] = useState(conversation.contact.memo || '')
  const [updating, setUpdating] = useState(false)

  async function updateStatus(status: string) {
    setUpdating(true)
    try {
      const response = await fetch(
        `/api/conversations/${conversation.id}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, version: conversation.version }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      onUpdate()
    } catch (error) {
      console.error('Failed to update status:', error)
      alert('ステータスの更新に失敗しました')
    } finally {
      setUpdating(false)
    }
  }

  async function updateAssignment(assignedUserId: string) {
    setUpdating(true)
    try {
      const response = await fetch(
        `/api/conversations/${conversation.id}/assign`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assignedUserId: assignedUserId || null,
          }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to update assignment')
      }

      onUpdate()
    } catch (error) {
      console.error('Failed to update assignment:', error)
      alert('担当者の更新に失敗しました')
    } finally {
      setUpdating(false)
    }
  }

  async function updatePriority(priority: string, urgency: string) {
    setUpdating(true)
    try {
      const response = await fetch(
        `/api/conversations/${conversation.id}/priority`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priority, urgency }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to update priority')
      }

      onUpdate()
    } catch (error) {
      console.error('Failed to update priority:', error)
      alert('優先度の更新に失敗しました')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ステータス */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          ステータス
        </label>
        <select
          className="mt-1 w-full rounded border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
          value={conversation.status}
          onChange={(e) => updateStatus(e.target.value)}
          disabled={updating}
        >
          <option value="NEW">新規</option>
          <option value="WORKING">対応中</option>
          <option value="PENDING">保留</option>
          <option value="RESOLVED">解決済み</option>
          <option value="CLOSED">クローズ</option>
          <option value="NO_ACTION_NEEDED">対応不要</option>
        </select>
      </div>

      {/* 担当者 */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          担当者
        </label>
        <select
          className="mt-1 w-full rounded border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
          value={conversation.assignedUser?.id || ''}
          onChange={(e) => updateAssignment(e.target.value)}
          disabled={updating}
        >
          <option value="">未割当</option>
          {/* TODO: ユーザー一覧を動的に取得 */}
        </select>
        {conversation.assignedUser && (
          <div className="mt-1 text-xs text-gray-600">
            {conversation.assignedUser.name}
          </div>
        )}
      </div>

      {/* トリアージ情報 */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            重要度
          </label>
          <select
            className="mt-1 w-full rounded border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
            value={conversation.priority}
            onChange={(e) =>
              updatePriority(e.target.value, conversation.urgency)
            }
            disabled={updating}
          >
            <option value="HIGH">高</option>
            <option value="MEDIUM">中</option>
            <option value="LOW">低</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            緊急度
          </label>
          <select
            className="mt-1 w-full rounded border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
            value={conversation.urgency}
            onChange={(e) =>
              updatePriority(conversation.priority, e.target.value)
            }
            disabled={updating}
          >
            <option value="NOW">即対応</option>
            <option value="TODAY">当日中</option>
            <option value="THIS_WEEK">今週中</option>
            <option value="ANYTIME">いつでも</option>
          </select>
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={conversation.isComplaint}
              disabled
              className="rounded border-gray-300"
            />
            <span className="text-sm font-medium text-gray-700">
              クレーム
            </span>
          </label>
        </div>
      </div>

      {/* メモ */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          内部メモ
        </label>
        <textarea
          className="mt-1 w-full rounded border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
          rows={4}
          placeholder="内部メモを入力..."
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          disabled
        />
        <p className="mt-1 text-xs text-gray-500">
          ※メモ機能は今後実装予定
        </p>
      </div>

      {/* タグ */}
      <div>
        <TagSelector
          conversationId={conversation.id}
          selectedTags={conversation.tags}
          onUpdate={onUpdate}
        />
      </div>

      {/* 顧客情報 */}
      <div className="border-t pt-6">
        <h3 className="text-sm font-medium text-gray-700">顧客情報</h3>
        <div className="mt-3 space-y-2 text-sm">
          <div>
            <span className="text-gray-600">LINE ID:</span>
            <div className="mt-1 break-all font-mono text-xs text-gray-900">
              {conversation.contact.id}
            </div>
          </div>
        </div>
      </div>

      {/* 変更履歴 */}
      <div className="border-t pt-6">
        <ConversationHistory conversationId={conversation.id} />
      </div>
    </div>
  )
}
