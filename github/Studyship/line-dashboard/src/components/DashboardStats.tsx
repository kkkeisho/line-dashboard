'use client'

import Link from 'next/link'

interface DashboardStatsProps {
  stats: {
    needsActionCount: number
    todayResponseCount: number
    myAssignedCount: number
    statusCounts: Record<string, number>
  } | null
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  if (!stats) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-200" />
        ))}
      </div>
    )
  }

  const statusLabels: Record<string, string> = {
    NEW: '新規',
    WORKING: '対応中',
    PENDING: '保留',
    RESOLVED: '解決済み',
    CLOSED: 'クローズ',
    NO_ACTION_NEEDED: '対応不要',
  }

  return (
    <div className="space-y-4">
      {/* メインKPIカード */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* 未対応件数 */}
        <Link
          href="/inbox?needsAction=true"
          className="block rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm transition-all hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-800">未対応</p>
              <p className="mt-2 text-3xl font-bold text-red-600">
                {stats.needsActionCount}
              </p>
            </div>
            <div className="rounded-full bg-red-100 p-3">
              <svg
                className="h-8 w-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-xs text-red-700">
            クリックして確認
          </p>
        </Link>

        {/* 今日の対応件数 */}
        <div className="rounded-lg border border-green-200 bg-green-50 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">今日の対応</p>
              <p className="mt-2 text-3xl font-bold text-green-600">
                {stats.todayResponseCount}
              </p>
            </div>
            <div className="rounded-full bg-green-100 p-3">
              <svg
                className="h-8 w-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* 自分の担当件数 */}
        <Link
          href="/inbox?assignedToMe=true"
          className="block rounded-lg border border-blue-200 bg-blue-50 p-6 shadow-sm transition-all hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">自分の担当</p>
              <p className="mt-2 text-3xl font-bold text-blue-600">
                {stats.myAssignedCount}
              </p>
            </div>
            <div className="rounded-full bg-blue-100 p-3">
              <svg
                className="h-8 w-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-xs text-blue-700">
            クリックして確認
          </p>
        </Link>
      </div>

      {/* ステータス別件数 */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-gray-700">
          ステータス別件数
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Object.entries(stats.statusCounts).map(([status, count]) => (
            <Link
              key={status}
              href={`/inbox?status=${status}`}
              className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-center transition-all hover:border-gray-300 hover:shadow-sm"
            >
              <div className="text-xl font-bold text-gray-900">{count}</div>
              <div className="mt-1 text-xs text-gray-600">
                {statusLabels[status] || status}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
