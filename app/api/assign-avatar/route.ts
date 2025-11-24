import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRandomAvatarServer } from '@/lib/utils/avatars-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get random avatar
    const avatarUrl = await getRandomAvatarServer()

    if (!avatarUrl) {
      return NextResponse.json(
        { error: 'No avatars available' },
        { status: 404 }
      )
    }

    // Update user with avatar
    const { error } = await supabase
      .from('users')
      // @ts-expect-error - Supabase type inference issue
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id)

    if (error) {
      console.error('Error updating avatar:', error)
      return NextResponse.json(
        { error: 'Failed to update avatar' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, avatar_url: avatarUrl })
  } catch (error) {
    console.error('Error assigning avatar:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

