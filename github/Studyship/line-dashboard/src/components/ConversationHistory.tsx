'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface User {
  id: string
  name: string
  email: string
}

interface AuditLog {
  id: string
  action: string
  changes: Record<string, any>
  createdAt: string
  user: User
}

interface ConversationHistoryProps {
  conversationId: string
}

export function ConversationHistory({ conversationId }: ConversationHistoryProps) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId])

  async function loadLogs() {
    try {
      const res = await fetch(`/api/audit-logs?conversationId=${conversationId}`)

      if (!res.ok) {
        console.error('Failed to load conversation history')
        return
      }

      const data = await res.json()
      setLogs(data.logs)
    } catch (error) {
      console.error('Failed to load conversation history:', error)
    } finally {
      setLoading(false)
    }
  }

  const actionLabels: Record<string, string> = {
    SEND_MESSAGE: '返信送信',
    STATUS_CHANGED: 'ステータス変更',
    ASSIGNED: '担当変更',
    SELF_ASSIGNED: '自己アサイン',
    OVERRIDE_TRIAGE: 'トリアージ変更',
    MEMO_UPDATED: 'メモ更新',
  }

  if (loading) {
    return (
      <div className="text-xs text-gray-400">
        履歴を読み込み中...
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="text-xs text-gray-400">
        変更履歴はありません
      </div>
    )
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-gray-900">変更履歴</h3>
      <div className="space-y-3">
        {logs.map((log) => (
          <div
            key={log.id}
            className="rounded border border-gray-200 bg-gray-50 p-3"
          >
            <div className="mb-1 flex items-center justify-between">
              <div className="text-xs font-medium text-gray-700">
                {actionLabels[log.action] || log.action}
              </div>
              <div className="text-xs text-gray-500">
                {format(new Date(log.createdAt), 'MM/dd HH:mm', {
                  locale: ja,
                })}
              </div>
            </div>

            <div className="mb-1 text-xs text-gray-600">
              {log.user.name}
            </div>

            {/* 変更内容の表示 */}
            {log.action === 'STATUS_CHANGED' && log.changes.from && log.changes.to && (
              <div className="text-xs text-gray-700">
                {log.changes.from} → {log.changes.to}
              </div>
            )}

            {log.action === 'ASSIGNED' && (
              <div className="text-xs text-gray-700">
                {log.changes.from ? `${log.changes.fromUserName} →` : '未割り当て →'} {log.changes.toUserName || '未割り当て'}
              </div>
            )}

            {log.action === 'OVERRIDE_TRIAGE' && (
              <div className="text-xs text-gray-700">
                {log.changes.newPriority && (
                  <div>優先度: {log.changes.oldPriority} → {log.changes.newPriority}</div>
                )}
                {log.changes.newUrgency && (
                  <div>緊急度: {log.changes.oldUrgency} → {log.changes.newUrgency}</div>
                )}
                {log.changes.newIsComplaint !== undefined && (
                  <div>クレーム: {log.changes.oldIsComplaint ? 'あり' : 'なし'} → {log.changes.newIsComplaint ? 'あり' : 'なし'}</div>
                )}
              </div>
            )}

            {log.action === 'SEND_MESSAGE' && log.changes.text && (
              <div className="text-xs text-gray-700">
                「{log.changes.text}」
              </div>
            )}

            {log.action === 'MEMO_UPDATED' && (
              <div className="text-xs text-gray-700">
                メモを更新しました
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
