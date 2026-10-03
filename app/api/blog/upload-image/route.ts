import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { Database } from '@/types/database'

type UserProfile = Pick<Database['public']['Tables']['users']['Row'], 'is_admin'>
    | null

const BUCKET = 'blog-images'

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
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userProfile } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!(userProfile as UserProfile)?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' }, { status: 400 })
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 })
    }

    // Generate unique filename (stored at the bucket root)
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `blog-${timestamp}-${randomString}.${fileExtension}`

    // Convert File to ArrayBuffer then to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Prefer the service-role client: it bypasses storage RLS (which has to
    // be created manually in the Dashboard and is the usual reason uploads
    // fail with a generic error) and can auto-create the bucket.
    const service = createServiceClient()
    if (service) {
      await ensureBucket(service)

      const { error: uploadError } = await service.storage
        .from(BUCKET)
        .upload(fileName, buffer, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        console.error('Blog image upload error:', uploadError)
        return NextResponse.json({ error: `Failed to upload image: ${uploadError.message}` }, { status: 500 })
      }

      const { data: { publicUrl } } = service.storage
        .from(BUCKET)
        .getPublicUrl(fileName)

      return NextResponse.json({
        url: publicUrl,
        path: fileName
      })
    }

    // Fallback: no service key configured, upload as the admin user
    // (requires the blog-images bucket + storage policies from the dashboard).
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Blog image upload error:', uploadError)
      return NextResponse.json({ error: `Failed to upload image: ${uploadError.message}` }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(fileName)

    return NextResponse.json({ 
      url: publicUrl,
      path: fileName
    })
  } catch (error) {
    console.error('Error uploading image:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

