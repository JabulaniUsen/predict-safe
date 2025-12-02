'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Database } from '@/types/database'

interface ConfigManagerProps {
  config: any[]
}

export function ConfigManager({ config }: ConfigManagerProps) {
  const [loading, setLoading] = useState(false)
  const configMap = new Map(config.map((c) => [c.key, c.value]))

  // Parse social links from config - handle both string and object formats
  const getSocialLinks = () => {
    const socialLinksValue = configMap.get('social_links')
    if (!socialLinksValue) return {}
    
    if (typeof socialLinksValue === 'string') {
      try {
        return JSON.parse(socialLinksValue)
      } catch {
        return {}
      }
    }
    return socialLinksValue || {}
  }
  
  const socialLinks = getSocialLinks()
  
  const [socialLinksState, setSocialLinksState] = useState({
    facebook: socialLinks.facebook || '',
    twitter: socialLinks.twitter || '',
    instagram: socialLinks.instagram || '',
    youtube: socialLinks.youtube || '',
    linkedin: socialLinks.linkedin || '',
  })

  // Get WhatsApp number from config - handle both array (legacy) and string formats
  const getWhatsAppNumber = () => {
    const whatsappValue = configMap.get('whatsapp_number') || configMap.get('whatsapp_numbers')
    if (!whatsappValue) return ''
    
    // If it's already a string, use it
    if (typeof whatsappValue === 'string') {
      // Check if it's a JSON array (legacy format)
      try {
        const parsed = JSON.parse(whatsappValue)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed[0] // Use first number from legacy array
        }
      } catch {
        // Not JSON, use as string
        return whatsappValue
      }
    }
    
    // If it's an array (legacy), use first number
    if (Array.isArray(whatsappValue) && whatsappValue.length > 0) {
      return whatsappValue[0]
    }
    
    return ''
  }
  
  const [whatsappNumber, setWhatsappNumber] = useState<string>(getWhatsAppNumber())

  const handleUpdateConfig = async (key: string, value: any) => {
    setLoading(true)
    try {
      const supabase = createClient()
      // For JSONB, Supabase expects the value as-is (it will handle JSON conversion)
      // For strings, we pass them directly
      const jsonValue = typeof value === 'string' ? value : value
      
      const upsertData: Database['public']['Tables']['site_config']['Insert'] = {
        key,
        value: jsonValue,
      }
      
      const { error } = await supabase
        .from('site_config')
        // @ts-expect-error - Supabase type inference issue
        .upsert(upsertData, { onConflict: 'key' })

      if (error) throw error

      toast.success('Configuration updated!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update config')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateSocialLinks = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      // For JSONB fields, pass the object directly - Supabase will handle JSON conversion
      const upsertData: Database['public']['Tables']['site_config']['Insert'] = {
        key: 'social_links',
        value: socialLinksState,
      }
      
      const { error } = await supabase
        .from('site_config')
        // @ts-expect-error - Supabase type inference issue
        .upsert(upsertData, { onConflict: 'key' })

      if (error) throw error

      toast.success('Social links updated!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update social links')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateWhatsAppNumber = async () => {
    if (!whatsappNumber.trim()) {
      toast.error('WhatsApp number cannot be empty')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      
      const upsertData: Database['public']['Tables']['site_config']['Insert'] = {
        key: 'whatsapp_number',
        value: whatsappNumber.trim(),
      }
      
      const { error } = await supabase
        .from('site_config')
        // @ts-expect-error - Supabase type inference issue
        .upsert(upsertData, { onConflict: 'key' })

      if (error) throw error

      toast.success('WhatsApp number updated!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update WhatsApp number')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Site Configuration</h1>
        <p className="text-sm lg:text-base text-muted-foreground mt-1">Manage site settings and content</p>
      </div>

    <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-2 border-gray-200 shadow-sm">
          <CardHeader className="p-5 border-b border-gray-200">
            <CardTitle className="text-lg font-semibold">Site Header</CardTitle>
            <CardDescription className="text-sm mt-1">Website title and tagline</CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="site_header">Site Title / Header</Label>
              <Input
                id="site_header"
                defaultValue={configMap.get('site_header') || 'PredictSafe'}
                onBlur={(e) => handleUpdateConfig('site_header', e.target.value)}
                placeholder="PredictSafe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site_subheader">Site Subheader / Tagline</Label>
              <Textarea
                id="site_subheader"
                defaultValue={configMap.get('site_subheader') || 'Your trusted source for accurate football predictions'}
                onBlur={(e) => handleUpdateConfig('site_subheader', e.target.value)}
                placeholder="Your trusted source for accurate football predictions"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-200 shadow-sm">
          <CardHeader className="p-5 border-b border-gray-200">
            <CardTitle className="text-lg font-semibold">Hero Section</CardTitle>
            <CardDescription className="text-sm mt-1">Homepage hero content</CardDescription>
        </CardHeader>
          <CardContent className="p-5 space-y-4">
          <div className="space-y-2">
              <Label htmlFor="hero_headline">Hero Headline</Label>
            <Input
              id="hero_headline"
                defaultValue={configMap.get('hero_headline') || 'Welcome to PredictSafe'}
              onBlur={(e) => handleUpdateConfig('hero_headline', e.target.value)}
                placeholder="Welcome to PredictSafe"
            />
          </div>
          <div className="space-y-2">
              <Label htmlFor="hero_subtext">Hero Subtext</Label>
            <Textarea
              id="hero_subtext"
                defaultValue={configMap.get('hero_subtext') || 'Your trusted source for accurate football predictions'}
              onBlur={(e) => handleUpdateConfig('hero_subtext', e.target.value)}
                placeholder="Your trusted source for accurate football predictions"
                rows={3}
            />
          </div>
        </CardContent>
      </Card>

        <Card className="border-2 border-gray-200 shadow-sm">
          <CardHeader className="p-5 border-b border-gray-200">
            <CardTitle className="text-lg font-semibold">Contact Information</CardTitle>
            <CardDescription className="text-sm mt-1">Contact details, Telegram, and WhatsApp</CardDescription>
        </CardHeader>
          <CardContent className="p-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="telegram_link">Telegram Link</Label>
            <Input
              id="telegram_link"
              defaultValue={configMap.get('telegram_link') || ''}
              onBlur={(e) => handleUpdateConfig('telegram_link', e.target.value)}
                placeholder="https://t.me/yourchannel"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_email">Contact Email</Label>
            <Input
              id="contact_email"
              type="email"
              defaultValue={configMap.get('contact_email') || ''}
              onBlur={(e) => handleUpdateConfig('contact_email', e.target.value)}
                placeholder="contact@predictsafe.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp_number">WhatsApp Number</Label>
              <Input
                id="whatsapp_number"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                onBlur={handleUpdateWhatsAppNumber}
                placeholder="+234 704 532 1193"
              />
              <p className="text-xs text-muted-foreground">
                Enter the WhatsApp number that will be used across the website
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-200 shadow-sm">
          <CardHeader className="p-5 border-b border-gray-200">
            <CardTitle className="text-lg font-semibold">Social Media Links</CardTitle>
            <CardDescription className="text-sm mt-1">Manage all social media profiles</CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="social_facebook">Facebook URL</Label>
              <Input
                id="social_facebook"
                value={socialLinksState.facebook}
                onChange={(e) => setSocialLinksState({ ...socialLinksState, facebook: e.target.value })}
                onBlur={handleUpdateSocialLinks}
                placeholder="https://facebook.com/yourpage"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="social_twitter">Twitter / X URL</Label>
              <Input
                id="social_twitter"
                value={socialLinksState.twitter}
                onChange={(e) => setSocialLinksState({ ...socialLinksState, twitter: e.target.value })}
                onBlur={handleUpdateSocialLinks}
                placeholder="https://twitter.com/yourhandle"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="social_instagram">Instagram URL</Label>
              <Input
                id="social_instagram"
                value={socialLinksState.instagram}
                onChange={(e) => setSocialLinksState({ ...socialLinksState, instagram: e.target.value })}
                onBlur={handleUpdateSocialLinks}
                placeholder="https://instagram.com/yourhandle"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="social_youtube">YouTube URL</Label>
              <Input
                id="social_youtube"
                value={socialLinksState.youtube}
                onChange={(e) => setSocialLinksState({ ...socialLinksState, youtube: e.target.value })}
                onBlur={handleUpdateSocialLinks}
                placeholder="https://youtube.com/@yourchannel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="social_linkedin">LinkedIn URL</Label>
              <Input
                id="social_linkedin"
                value={socialLinksState.linkedin}
                onChange={(e) => setSocialLinksState({ ...socialLinksState, linkedin: e.target.value })}
                onBlur={handleUpdateSocialLinks}
                placeholder="https://linkedin.com/company/yourcompany"
            />
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}


