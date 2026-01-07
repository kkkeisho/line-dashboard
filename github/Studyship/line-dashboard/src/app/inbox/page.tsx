import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { InboxPage } from '@/components/InboxPage'

export default async function Page() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return <InboxPage />
}
