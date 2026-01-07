'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardStats } from '@/components/DashboardStats'
import { UrgentConversations } from '@/components/UrgentConversations'
import { RecentConversations } from '@/components/RecentConversations'
import { Role } from '@prisma/client'

interface DashboardData {
  stats: {
    needsActionCount: number
    todayResponseCount: number
    myAssignedCount: number
    statusCounts: Record<string, number>
  } | null
  urgentConversations: any[] | null
  recentConversations: any[] | null
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData] = useState<DashboardData>({
    stats: null,
    urgentConversations: null,
    recentConversations: null,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      loadDashboardData()
    }
  }, [status, router])

  async function loadDashboardData() {
    try {
      setLoading(true)

      // 並列でAPIを呼び出し
      const [statsRes, urgentRes, recentRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/dashboard/urgent'),
        fetch('/api/dashboard/recent'),
      ])

      if (!statsRes.ok || !urgentRes.ok || !recentRes.ok) {
        throw new Error('Failed to load dashboard data')
      }

      const [statsData, urgentData, recentData] = await Promise.all([
        statsRes.json(),
        urgentRes.json(),
        recentRes.json(),
      ])

      setData({
        stats: statsData,
        urgentConversations: urgentData.conversations,
        recentConversations: recentData.conversations,
      })
    } catch (error) {
      console.error('Failed to load dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                ダッシュボード
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                ようこそ、{session.user.name}さん
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/inbox"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Inboxへ
              </Link>
              {session.user.role === Role.ADMIN && (
                <Link
                  href="/admin/users"
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  管理画面
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* 統計情報 */}
          <DashboardStats stats={data.stats} />

          {/* 緊急対応と最近の会話 */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <UrgentConversations conversations={data.urgentConversations} />
            <RecentConversations conversations={data.recentConversations} />
          </div>

          {/* クイックアクション */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              クイックアクション
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/inbox"
                className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 transition-all hover:border-blue-300 hover:bg-blue-50"
              >
                <svg
                  className="h-6 w-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
                <div>
                  <div className="font-medium text-gray-900">Inbox</div>
                  <div className="text-sm text-gray-600">全会話を確認</div>
                </div>
              </Link>

              <Link
                href="/inbox?needsAction=true"
                className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 transition-all hover:border-red-300 hover:bg-red-50"
              >
                <svg
                  className="h-6 w-6 text-red-600"
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
                <div>
                  <div className="font-medium text-gray-900">未対応</div>
                  <div className="text-sm text-gray-600">対応が必要な会話</div>
                </div>
              </Link>

              <Link
                href="/inbox?assignedToMe=true"
                className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 transition-all hover:border-blue-300 hover:bg-blue-50"
              >
                <svg
                  className="h-6 w-6 text-blue-600"
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
                <div>
                  <div className="font-medium text-gray-900">自分の担当</div>
                  <div className="text-sm text-gray-600">担当中の会話</div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
