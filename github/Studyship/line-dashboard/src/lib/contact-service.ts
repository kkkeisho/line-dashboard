import { prisma } from './prisma'
import { getLineProfile } from './line'

/**
 * Get existing contact or create new one
 * @param lineUserId - LINE user ID
 * @returns Contact record
 */
export async function getOrCreateContact(lineUserId: string) {
  // Try to find existing contact
  let contact = await prisma.contact.findUnique({
    where: { lineUserId },
  })

  if (contact) {
    // Update profile if contact exists (profiles may change)
    await updateContactProfile(lineUserId).catch((error) => {
      console.error('Failed to update contact profile:', error)
      // Continue even if profile update fails
    })
    return contact
  }

  // Create new contact if not exists
  try {
    const profile = await getLineProfile(lineUserId)

    contact = await prisma.contact.create({
      data: {
        lineUserId,
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl,
        followedAt: new Date(),
        isBlocked: false,
      },
    })

    console.log('New contact created:', {
      id: contact.id,
      displayName: contact.displayName,
      lineUserId: contact.lineUserId,
    })

    return contact
  } catch (error) {
    console.error('Failed to create contact:', error)
    throw error
  }
}

/**
 * Update contact profile from LINE
 * @param lineUserId - LINE user ID
 */
export async function updateContactProfile(lineUserId: string) {
  try {
    const profile = await getLineProfile(lineUserId)

    await prisma.contact.update({
      where: { lineUserId },
      data: {
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl,
      },
    })

    console.log('Contact profile updated:', lineUserId)
  } catch (error) {
    console.error('Failed to update contact profile:', error)
    throw error
  }
}

/**
 * Mark contact as blocked (user unfollowed)
 * @param lineUserId - LINE user ID
 */
export async function markContactAsBlocked(lineUserId: string) {
  try {
    await prisma.contact.update({
      where: { lineUserId },
      data: { isBlocked: true },
    })

    console.log('Contact marked as blocked:', lineUserId)
  } catch (error) {
    console.error('Failed to mark contact as blocked:', error)
    throw error
  }
}

/**
 * Unblock contact (user followed again)
 * @param lineUserId - LINE user ID
 */
export async function unblockContact(lineUserId: string) {
  try {
    await prisma.contact.update({
      where: { lineUserId },
      data: { isBlocked: false },
    })

    console.log('Contact unblocked:', lineUserId)
  } catch (error) {
    console.error('Failed to unblock contact:', error)
    throw error
  }
}
