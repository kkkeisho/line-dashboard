import { Role } from '@prisma/client'

export const Permissions = {
  // 返信権限
  canReply: (role: Role) => {
    return role === Role.ADMIN || role === Role.AGENT
  },

  // ステータス変更権限
  canUpdateStatus: (role: Role) => {
    return role === Role.ADMIN || role === Role.AGENT
  },

  // 担当者アサイン権限
  canAssign: (role: Role) => {
    return role === Role.ADMIN
    // 将来的に Agent でもアサイン可能にする場合は条件追加
  },

  // タグ編集権限
  canManageTags: (role: Role) => {
    return role === Role.ADMIN || role === Role.AGENT
  },

  // ユーザー管理権限
  canManageUsers: (role: Role) => {
    return role === Role.ADMIN
  },

  // 監査ログ閲覧権限
  canViewAuditLogs: (role: Role) => {
    return role === Role.ADMIN
  },

  // 会話閲覧権限（全員）
  canViewConversation: (role: Role) => {
    return true
  },
}
