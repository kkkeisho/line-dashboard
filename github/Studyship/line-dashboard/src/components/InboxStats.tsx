interface InboxStatsProps {
  stats: {
    needsActionCount: number
    stats: Record<string, number>
    total: number
  } | null
}

export function InboxStats({ stats }: InboxStatsProps) {
  if (!stats) {
    return null
  }

  return (
    <div className="mb-4 space-y-2">
      <div className="rounded bg-red-100 p-3">
        <div className="text-2xl font-bold text-red-600">
          {stats.needsActionCount}
        </div>
        <div className="text-sm text-red-800">未対応</div>
      </div>

      <div className="rounded bg-blue-100 p-3">
        <div className="text-2xl font-bold text-blue-600">
          {stats.total}
        </div>
        <div className="text-sm text-blue-800">合計</div>
      </div>
    </div>
  )
}
