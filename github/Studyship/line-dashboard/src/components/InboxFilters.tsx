'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Status, Priority, Urgency } from '@prisma/client'

export function InboxFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())

    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }

    router.push(`/inbox?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      {/* ステータスフィルタ */}
      <div>
        <label className="block text-sm font-medium">ステータス</label>
        <select
          className="mt-1 w-full rounded border p-2"
          value={searchParams.get('status') || ''}
          onChange={(e) => updateFilter('status', e.target.value)}
        >
          <option value="">全て</option>
          <option value={Status.NEW}>新規</option>
          <option value={Status.WORKING}>対応中</option>
          <option value={Status.PENDING}>保留</option>
          <option value={Status.RESOLVED}>解決済み</option>
          <option value={Status.CLOSED}>クローズ</option>
          <option value={Status.NO_ACTION_NEEDED}>対応不要</option>
        </select>
      </div>

      {/* 担当者フィルタ */}
      <div>
        <label className="block text-sm font-medium">担当者</label>
        <select
          className="mt-1 w-full rounded border p-2"
          value={searchParams.get('assignedUserId') || ''}
          onChange={(e) => updateFilter('assignedUserId', e.target.value)}
        >
          <option value="">全て</option>
          <option value="me">自分の担当</option>
        </select>
      </div>

      {/* 優先度フィルタ */}
      <div>
        <label className="block text-sm font-medium">優先度</label>
        <select
          className="mt-1 w-full rounded border p-2"
          value={searchParams.get('priority') || ''}
          onChange={(e) => updateFilter('priority', e.target.value)}
        >
          <option value="">全て</option>
          <option value={Priority.HIGH}>高</option>
          <option value={Priority.MEDIUM}>中</option>
          <option value={Priority.LOW}>低</option>
        </select>
      </div>

      {/* 緊急度フィルタ */}
      <div>
        <label className="block text-sm font-medium">緊急度</label>
        <select
          className="mt-1 w-full rounded border p-2"
          value={searchParams.get('urgency') || ''}
          onChange={(e) => updateFilter('urgency', e.target.value)}
        >
          <option value="">全て</option>
          <option value={Urgency.NOW}>今すぐ</option>
          <option value={Urgency.TODAY}>今日中</option>
          <option value={Urgency.THIS_WEEK}>今週中</option>
          <option value={Urgency.ANYTIME}>いつでも</option>
        </select>
      </div>

      {/* 検索 */}
      <div>
        <label className="block text-sm font-medium">検索</label>
        <input
          type="text"
          className="mt-1 w-full rounded border p-2"
          placeholder="顧客名を検索"
          value={searchParams.get('search') || ''}
          onChange={(e) => updateFilter('search', e.target.value)}
        />
      </div>
    </div>
  )
}
