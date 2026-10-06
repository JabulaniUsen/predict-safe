import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

const BUCKET = 'payment-proofs'
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
// Signed URL lifetime for payment proofs (1 year - proofs need to stay viewable for admins)
const SIGNED_URL_EXPIRES_IN = 60 * 60 * 24 * 365

async function ensureBucket(service: NonNullable<ReturnType<typeof createServiceClient>>) {
  const { data: buckets, error: listError } = await service.storage.listBuckets()
  if (listError) throw new Error(`Failed to check storage buckets: ${listError.message}`)
  if (!buckets?.some((b) => b.name === BUCKET)) {
    const { error: createError } = await service.storage.createBucket(BUCKET, { public: false })
    if (createError) throw new Error(`Storage bucket '${BUCKET}' is missing and could not be created: ${createError.message}`)
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const subscriptionId = (formData.get('subscriptionId') as string | null) || null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (!file.type.startsWith('image/') || !ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload PNG, JPG, GIF, or WEBP' },
        { status: 400 }
      )
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 })
    }
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    if (!['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(fileExt)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload PNG, JPG, GIF, or WEBP' },
        { status: 400 }
      )
    }

    const safeSuffix = subscriptionId
      ? subscriptionId.replace(/[^a-zA-Z0-9-_]/g, '')
      : Date.now().toString()
    const fileName = `${user.id}/${safeSuffix}_${Date.now()}.${fileExt}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Prefer the service-role client: it bypasses storage RLS (which has to
    // be created manually in the Dashboard and is the usual reason payment
    // proof uploads fail) and can auto-create the bucket.
    const service = createServiceClient()
    if (service) {
      await ensureBucket(service)

      const { error: uploadError } = await service.storage.from(BUCKET).upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })
      if (uploadError) {
        console.error('Payment proof upload error:', uploadError)
        return NextResponse.json({ error: `Unable to upload image: ${uploadError.message}` }, { status: 500 })
      }

      const { data: signedData, error: signedError } = await service.storage
        .from(BUCKET)
        .createSignedUrl(fileName, SIGNED_URL_EXPIRES_IN)
      if (signedError) {
        console.error('Payment proof signed URL error:', signedError)
        return NextResponse.json({ error: `Unable to upload image: ${signedError.message}` }, { status: 500 })
      }

      return NextResponse.json({ url: signedData.signedUrl, path: fileName })
    }

    // Fallback: no service key configured, upload as the user
    // (requires the payment-proofs bucket + storage policies).
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(fileName, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    })
    if (uploadError) {
      console.error('Payment proof upload error:', uploadError)
      const hint = uploadError.message?.toLowerCase().includes('bucket')
        ? ` Storage bucket '${BUCKET}' not found.`
        : uploadError.message?.toLowerCase().includes('row-level security') ||
            uploadError.message?.toLowerCase().includes('rls')
          ? ' Storage policy missing — the server upload needs SUPABASE_SERVICE_ROLE_KEY.'
          : ''
      return NextResponse.json({ error: `Unable to upload image: ${uploadError.message}.${hint}` }, { status: 500 })
    }

    const { data: signedData, error: signedError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(fileName, SIGNED_URL_EXPIRES_IN)
    if (signedError) {
      console.error('Payment proof signed URL error:', signedError)
      return NextResponse.json({ error: `Unable to upload image: ${signedError.message}` }, { status: 500 })
    }

    return NextResponse.json({ url: signedData.signedUrl, path: fileName })
  } catch (error) {
    console.error('Error uploading payment proof:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: `Unable to upload image: ${message}` }, { status: 500 })
  }
}
