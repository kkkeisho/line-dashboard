'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ConversationList } from '@/components/ConversationList'
import { InboxFilters } from '@/components/InboxFilters'
import { InboxStats } from '@/components/InboxStats'

export function InboxPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    loadConversations()
    loadStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  async function loadConversations() {
    setLoading(true)
    try {
      const params = new URLSearchParams(searchParams.toString())
      const res = await fetch(`/api/conversations?${params}`)
      const data = await res.json()
      setConversations(data.conversations)
    } catch (error) {
      console.error('Failed to load conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadStats() {
    try {
      const res = await fetch('/api/conversations/stats')
      const data = await res.json()
      setStats(data)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  return (
    <div className="flex h-screen">
      {/* サイドバー */}
      <aside className="w-64 border-r bg-gray-50 p-4 overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">フィルタ</h2>
        <InboxStats stats={stats} />
        <InboxFilters />
      </aside>

      {/* メインエリア */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <h1 className="mb-4 text-2xl font-bold">Inbox</h1>
          <ConversationList
            conversations={conversations}
            loading={loading}
          />
        </div>
      </main>
    </div>
  )
}
