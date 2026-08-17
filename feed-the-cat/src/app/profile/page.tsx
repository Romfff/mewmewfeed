import { getSession } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import ProfileClient from './ProfileClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export default async function ProfilePage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    include: { memes: true }
  })

  if (!user) redirect('/login')

  return <ProfileClient user={user} />
}
