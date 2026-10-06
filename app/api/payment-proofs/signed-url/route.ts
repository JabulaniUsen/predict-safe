import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

const BUCKET = 'payment-proofs'
// Fresh signed URLs for viewing proofs (7 days)
const SIGNED_URL_EXPIRES_IN = 60 * 60 * 24 * 7

/**
 * Mint a fresh signed URL for a payment proof stored in the private
 * `payment-proofs` bucket. Accepts either a storage path (`userId/file.jpg`)
 * or a previously stored URL (public or signed) from transaction metadata.
 * Only the proof owner or an admin can mint URLs.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const raw = request.nextUrl.searchParams.get('path')
    if (!raw) {
      return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 })
    }

    // Normalize: callers may pass a full URL (legacy public URL or an
    // expired signed URL) or a bare storage path.
    let storagePath = raw
    const bucketMarker = `/${BUCKET}/`
    const markerIndex = raw.indexOf(bucketMarker)
    if (markerIndex !== -1) {
      storagePath = decodeURIComponent(raw.slice(markerIndex + bucketMarker.length).split('?')[0])
    }

    if (!storagePath || storagePath.startsWith('http')) {
      // Not a storage object we can sign (e.g. external URL) - return as-is.
      return NextResponse.json({ url: raw })
    }

    // Authorization: owner of the proof folder, or admin.
    const ownerId = storagePath.split('/')[0]
    if (ownerId !== user.id) {
      const { data: profile } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
      if (!(profile as { is_admin?: boolean } | null)?.is_admin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const service = createServiceClient()
    const signer = service ?? supabase
    const { data, error } = await signer.storage.from(BUCKET).createSignedUrl(storagePath, SIGNED_URL_EXPIRES_IN)
    if (error) {
      console.error('Payment proof signed URL error:', error)
      return NextResponse.json({ error: `Unable to load image: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ url: data.signedUrl })
  } catch (error) {
    console.error('Error creating payment proof signed URL:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
