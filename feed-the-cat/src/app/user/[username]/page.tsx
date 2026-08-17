import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import UserClient from './UserClient'

export const dynamic = 'force-dynamic'

export default async function PublicProfilePage(props: { params: Promise<{ username: string }> }) {
  const params = await props.params;
  const username = decodeURIComponent(params.username);

  const user = await prisma.user.findUnique({
    where: { username: username },
    include: { memes: true }
  })

  if (!user) {
    notFound()
  }

  const numSlots = Math.floor(user.level / 2)
  const slots = Array.from({ length: numSlots }).map((_, i) => i)

  return <UserClient user={user} numSlots={numSlots} slots={slots} />
}
