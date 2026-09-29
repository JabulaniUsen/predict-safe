import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { deactivateExpiredSubscriptions } from '@/lib/subscriptions/deactivate-expired'

export const dynamic = 'force-dynamic'

function isAuthorized(request: NextRequest, cronToken: string | undefined, userIsAdmin: boolean) {
  if (userIsAdmin) return true
  if (!cronToken) return false
  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${cronToken}`
}

async function handleCheckExpired(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if caller is an admin (for manual trigger)
    let userIsAdmin = false
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const userProfileResult: any = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single()
      userIsAdmin = userProfileResult.data?.is_admin === true
    }

    const cronToken = process.env.SYSTEM_API_TOKEN || process.env.CRON_SECRET

    if (!isAuthorized(request, cronToken, userIsAdmin)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Cron/system calls have no user session, so the anon client is blocked by
    // RLS — use the service client (bypasses RLS) when available.
    const serviceClient = createServiceClient()
    const db = serviceClient ?? supabase
    if (!serviceClient && !user) {
      return NextResponse.json(
        { error: 'Server misconfigured: SUPABASE_SERVICE_ROLE_KEY is not set' },
        { status: 500 }
      )
    }

    const { checked, deactivated, ids } = await deactivateExpiredSubscriptions(db)

    return NextResponse.json({
      message: deactivated === 0 ? 'No expired subscriptions found' : 'Expired plans deactivated',
      checked,
      expired: deactivated,
      deactivated,
      ids,
    })
  } catch (error: any) {
    console.error('Error checking expired subscriptions:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return handleCheckExpired(request)
}

// GET support for cron providers that can only issue GET requests.
export async function GET(request: NextRequest) {
  return handleCheckExpired(request)
}
