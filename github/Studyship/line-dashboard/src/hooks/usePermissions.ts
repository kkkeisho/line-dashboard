import { useSession } from 'next-auth/react'
import { Permissions } from '@/lib/permissions'
import { Role } from '@prisma/client'

export function usePermissions() {
  const { data: session } = useSession()
  const role = session?.user?.role as Role | undefined

  return {
    canReply: role ? Permissions.canReply(role) : false,
    canUpdateStatus: role ? Permissions.canUpdateStatus(role) : false,
    canAssign: role ? Permissions.canAssign(role) : false,
    canManageTags: role ? Permissions.canManageTags(role) : false,
    canManageUsers: role ? Permissions.canManageUsers(role) : false,
    canViewAuditLogs: role ? Permissions.canViewAuditLogs(role) : false,
    isAdmin: role === Role.ADMIN,
    isAgent: role === Role.AGENT,
    isViewer: role === Role.VIEWER,
  }
}
