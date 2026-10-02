import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { Database } from '@/types/database'

type UserProfile = Pick<Database['public']['Tables']['users']['Row'], 'is_admin'> | null

const BUCKET = 'payment-logos'
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']

async function ensureBucket(service: NonNullable<ReturnType<typeof createServiceClient>>) {
  const { data: buckets, error: listError } = await service.storage.listBuckets()
  if (listError) throw new Error(`Failed to check storage buckets: ${listError.message}`)
  if (!buckets?.some((b) => b.name === BUCKET)) {
    const { error: createError } = await service.storage.createBucket(BUCKET, { public: true })
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

    const { data: userProfile } = await supabase.from('users').select('is_admin').eq('id', user.id).single()

    if (!(userProfile as UserProfile)?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const methodId = (formData.get('methodId') as string | null) || `temp-${Date.now()}`

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (!file.type.startsWith('image/') || !ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload PNG, JPG, GIF, WEBP, or SVG' },
        { status: 400 }
      )
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 })
    }
    const fileExt = file.name.split('.').pop()?.toLowerCase() || ''
    if (!ALLOWED_EXTS.includes(fileExt)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload PNG, JPG, GIF, WEBP, or SVG' },
        { status: 400 }
      )
    }

    const safeId = methodId.replace(/[^a-zA-Z0-9-_]/g, '') || `temp-${Date.now()}`
    const fileName = `payment-methods/${safeId}.${fileExt}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Prefer the service-role client: it bypasses storage RLS and can
    // auto-create the bucket when it doesn't exist yet.
    const service = createServiceClient()
    if (service) {
      await ensureBucket(service)

      const { error: uploadError } = await service.storage.from(BUCKET).upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true,
      })
      if (uploadError) {
        console.error('Payment logo upload error:', uploadError)
        return NextResponse.json({ error: `Failed to upload logo: ${uploadError.message}` }, { status: 500 })
      }

      const {
        data: { publicUrl },
      } = service.storage.from(BUCKET).getPublicUrl(fileName)
      return NextResponse.json({ url: publicUrl, path: fileName })
    }

    // Fallback: no service key configured, upload as the admin user
    // (requires the payment-logos bucket + storage policies from migration 032).
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(fileName, buffer, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: true,
    })
    if (uploadError) {
      console.error('Payment logo upload error:', uploadError)
      const hint = uploadError.message?.toLowerCase().includes('bucket')
        ? ` Storage bucket '${BUCKET}' not found — run migration 032_ensure_payment_logos_bucket.sql.`
        : ''
      return NextResponse.json({ error: `Failed to upload logo: ${uploadError.message}.${hint}` }, { status: 500 })
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(fileName)
    return NextResponse.json({ url: publicUrl, path: fileName })
  } catch (error) {
    console.error('Error uploading payment logo:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
