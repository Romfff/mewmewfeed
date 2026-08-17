import prisma from '@/lib/prisma'
import Link from 'next/link'
import { syncRedisToPostgres } from '@/app/actions'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export default async function Leaderboard() {
  // Force sync from Redis to Postgres before reading the leaderboard
  await syncRedisToPostgres().catch(console.error)

  const topUsers = await prisma.user.findMany({
    orderBy: [
      { level: 'desc' },
      { exp: 'desc' }
    ],
    take: 100,
    select: {
      username: true,
      displayName: true,
      avatarUrl: true,
      level: true,
      exp: true
    }
  })

  return (
    <div className="container">
      <nav className="nav">
        <h1>Leaderboard</h1>
        <div className="nav-links">
          <Link href="/" className="btn btn-secondary">Back to Game</Link>
        </div>
      </nav>

      <div className="card" style={{ maxWidth: '800px', margin: '2rem auto' }}>
        <h2>Top 100 Cats</h2>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Name</th>
                <th>Level</th>
                <th>Total EXP</th>
              </tr>
            </thead>
            <tbody>
              {topUsers.map((user, i) => (
                <tr key={user.username}>
                  <td>{i + 1}</td>
                  <td style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.05)', flexShrink: 0 }}>
                      {user.avatarUrl && <img src={user.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                    <Link href={`/user/${user.username}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {user.displayName || user.username}
                    </Link>
                  </td>
                  <td>{user.level}</td>
                  <td>{user.exp}</td>
                </tr>
              ))}
              {topUsers.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center' }}>No users yet. Be the first to play!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
