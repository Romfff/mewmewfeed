import { NextResponse } from 'next/server'
import { syncRedisToPostgres } from '@/app/actions'

export const dynamic = 'force-dynamic'

export async function GET() {
  const result = await syncRedisToPostgres()
  return NextResponse.json(result)
}
