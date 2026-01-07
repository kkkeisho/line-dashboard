import { Status } from '@prisma/client'

/**
 * ステータス遷移の妥当性チェック
 * ビジネスロジックに基づいて、現在のステータスから次のステータスへの遷移が可能かを判定
 */
export function isValidStatusTransition(from: Status, to: Status): boolean {
  // 同じステータスへの遷移は常に許可（冪等性）
  if (from === to) {
    return true
  }

  const transitions: Record<Status, Status[]> = {
    [Status.NEW]: [Status.WORKING, Status.NO_ACTION_NEEDED, Status.CLOSED],
    [Status.WORKING]: [Status.PENDING, Status.RESOLVED, Status.CLOSED, Status.NO_ACTION_NEEDED],
    [Status.PENDING]: [Status.WORKING, Status.RESOLVED, Status.CLOSED],
    [Status.RESOLVED]: [Status.WORKING, Status.CLOSED],
    [Status.CLOSED]: [Status.WORKING], // 再オープン
    [Status.NO_ACTION_NEEDED]: [Status.WORKING, Status.CLOSED],
  }

  return transitions[from]?.includes(to) || false
}

/**
 * ステータスの表示名を取得（日本語）
 */
export function getStatusDisplayName(status: Status): string {
  const displayNames: Record<Status, string> = {
    [Status.NEW]: '新規',
    [Status.WORKING]: '対応中',
    [Status.PENDING]: '保留',
    [Status.RESOLVED]: '解決済み',
    [Status.CLOSED]: 'クローズ',
    [Status.NO_ACTION_NEEDED]: '対応不要',
  }

  return displayNames[status] || status
}

/**
 * ステータスの色コードを取得（UI用）
 */
export function getStatusColor(status: Status): string {
  const colors: Record<Status, string> = {
    [Status.NEW]: '#3B82F6', // Blue
    [Status.WORKING]: '#F59E0B', // Amber
    [Status.PENDING]: '#8B5CF6', // Purple
    [Status.RESOLVED]: '#10B981', // Green
    [Status.CLOSED]: '#6B7280', // Gray
    [Status.NO_ACTION_NEEDED]: '#64748B', // Slate
  }

  return colors[status] || '#6B7280'
}

/**
 * ステータス変更時の自動処理
 * 将来的にSLA期限設定や自動通知などを実装
 */
export async function onStatusChange(
  conversationId: string,
  newStatus: Status,
  oldStatus: Status
) {
  // Phase 2で以下を実装予定：
  // - RESOLVED → CLOSED の自動遷移（X日後）
  // - SLA期限の設定/クリア
  // - 担当者への通知
  // - ステータス変更時の自動タグ付け

  console.log(
    `Status changed for conversation ${conversationId}: ${oldStatus} -> ${newStatus}`
  )
}

/**
 * 次に遷移可能なステータス一覧を取得
 */
export function getAvailableStatusTransitions(currentStatus: Status): Status[] {
  return Object.values(Status).filter((status) =>
    isValidStatusTransition(currentStatus, status)
  )
}
