'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface Contact {
  id: string
  displayName: string
}

interface Conversation {
  id: string
  status: string
  contact: Contact
}

interface AuditLog {
  id: string
  action: string
  changes: Record<string, any>
  ipAddress: string
  userAgent: string
  createdAt: string
  user: User
  conversation: Conversation | null
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 100,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // フィルタ
  const [actionFilter, setActionFilter] = useState('')
  const [userIdFilter, setUserIdFilter] = useState('')

  useEffect(() => {
    loadLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, actionFilter, userIdFilter])

  async function loadLogs() {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })

      if (actionFilter) {
        params.append('action', actionFilter)
      }

      if (userIdFilter) {
        params.append('userId', userIdFilter)
      }

      const res = await fetch(`/api/audit-logs?${params.toString()}`)

      if (!res.ok) {
        if (res.status === 403) {
          setError('管理者権限が必要です')
        } else {
          setError('監査ログの読み込みに失敗しました')
        }
        return
      }

      const data = await res.json()
      setLogs(data.logs)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Failed to load audit logs:', error)
      setError('監査ログの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  function handlePageChange(newPage: number) {
    setPagination((prev) => ({ ...prev, page: newPage }))
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="text-blue-600 hover:underline"
          >
            再読み込み
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">監査ログ</h1>

        {/* フィルタ */}
        <div className="mb-4 flex gap-4 rounded-lg bg-white p-4 shadow">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              操作
            </label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value)
                setPagination((prev) => ({ ...prev, page: 1 }))
              }}
              className="rounded border border-gray-300 px-3 py-2"
            >
              <option value="">すべて</option>
              <option value="SEND_MESSAGE">返信送信</option>
              <option value="STATUS_CHANGED">ステータス変更</option>
              <option value="ASSIGNED">担当変更</option>
              <option value="SELF_ASSIGNED">自己アサイン</option>
              <option value="OVERRIDE_TRIAGE">トリアージ変更</option>
              <option value="MEMO_UPDATED">メモ更新</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              ユーザーID
            </label>
            <input
              type="text"
              value={userIdFilter}
              onChange={(e) => {
                setUserIdFilter(e.target.value)
                setPagination((prev) => ({ ...prev, page: 1 }))
              }}
              placeholder="フィルタなし"
              className="w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setActionFilter('')
                setUserIdFilter('')
                setPagination((prev) => ({ ...prev, page: 1 }))
              }}
              className="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600"
            >
              クリア
            </button>
          </div>
        </div>

        {/* 統計情報 */}
        <div className="mb-4 rounded-lg bg-white p-4 shadow">
          <div className="text-sm text-gray-600">
            全 {pagination.total} 件中 {(pagination.page - 1) * pagination.limit + 1} -{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} 件を表示
          </div>
        </div>

        {/* テーブル */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="text-gray-600">読み込み中...</div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg bg-white shadow">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-gray-100">
                  <th className="p-3 text-left text-sm font-medium text-gray-700">
                    日時
                  </th>
                  <th className="p-3 text-left text-sm font-medium text-gray-700">
                    ユーザー
                  </th>
                  <th className="p-3 text-left text-sm font-medium text-gray-700">
                    操作
                  </th>
                  <th className="p-3 text-left text-sm font-medium text-gray-700">
                    会話
                  </th>
                  <th className="p-3 text-left text-sm font-medium text-gray-700">
                    変更内容
                  </th>
                  <th className="p-3 text-left text-sm font-medium text-gray-700">
                    IP
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      監査ログがありません
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="p-3 text-sm">
                        {format(new Date(log.createdAt), 'yyyy/MM/dd HH:mm:ss', {
                          locale: ja,
                        })}
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-gray-900">
                          {log.user.name}
                        </div>
                        <div className="text-xs text-gray-600">
                          {log.user.email}
                        </div>
                      </td>
                      <td className="p-3">
                        <ActionBadge action={log.action} />
                      </td>
                      <td className="p-3">
                        {log.conversation ? (
                          <a
                            href={`/conversations/${log.conversation.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {log.conversation.contact.displayName}
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        <pre className="max-w-md overflow-auto text-xs text-gray-700">
                          {JSON.stringify(log.changes, null, 2)}
                        </pre>
                      </td>
                      <td className="p-3 text-xs text-gray-600">
                        {log.ipAddress}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ページネーション */}
        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1 || loading}
            className="rounded border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            前へ
          </button>
          <span className="flex items-center px-4 py-2 text-gray-700">
            ページ {pagination.page} / {pagination.totalPages}
          </span>
          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages || loading}
            className="rounded border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            次へ
          </button>
        </div>
      </div>
    </div>
  )
}

function ActionBadge({ action }: { action: string }) {
  const labels: Record<string, { label: string; color: string }> = {
    SEND_MESSAGE: { label: '返信送信', color: 'bg-blue-100 text-blue-800' },
    STATUS_CHANGED: {
      label: 'ステータス変更',
      color: 'bg-yellow-100 text-yellow-800',
    },
    ASSIGNED: { label: '担当変更', color: 'bg-green-100 text-green-800' },
    SELF_ASSIGNED: {
      label: '自己アサイン',
      color: 'bg-green-100 text-green-800',
    },
    OVERRIDE_TRIAGE: {
      label: 'トリアージ変更',
      color: 'bg-purple-100 text-purple-800',
    },
    MEMO_UPDATED: { label: 'メモ更新', color: 'bg-pink-100 text-pink-800' },
  }

  const config = labels[action] || {
    label: action,
    color: 'bg-gray-100 text-gray-800',
  }

  return (
    <span className={`rounded px-2 py-1 text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  )
}
