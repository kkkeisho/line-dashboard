import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { Role } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

/**
 * Create a new user with hashed password
 * Used by administrators to create new staff accounts
 */
export async function createUser(
  email: string,
  password: string,
  name: string,
  role: Role = Role.AGENT
) {
  const passwordHash = await bcrypt.hash(password, 10)

  return await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      role,
    },
  })
}

/**
 * Get the current user session on the server
 */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  return session?.user
}

/**
 * Check if the current user has the required role
 */
export async function requireRole(role: Role | Role[]) {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const roles = Array.isArray(role) ? role : [role]

  if (!roles.includes(user.role)) {
    throw new Error('Forbidden')
  }

  return user
}
