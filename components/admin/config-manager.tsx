'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface ConfigManagerProps {
  config: any[]
}

export function ConfigManager({ config }: ConfigManagerProps) {
  const [loading, setLoading] = useState(false)
  const configMap = new Map(config.map((c) => [c.key, c.value]))

  const handleUpdateConfig = async (key: string, value: any) => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('site_config')
        .upsert({ key, value }, { onConflict: 'key' })

      if (error) throw error

      toast.success('Configuration updated!')
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update config')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Hero Section</CardTitle>
          <CardDescription>Edit homepage hero content</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hero_headline">Headline</Label>
            <Input
              id="hero_headline"
              defaultValue={configMap.get('hero_headline') || ''}
              onBlur={(e) => handleUpdateConfig('hero_headline', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hero_subtext">Subtext</Label>
            <Textarea
              id="hero_subtext"
              defaultValue={configMap.get('hero_subtext') || ''}
              onBlur={(e) => handleUpdateConfig('hero_subtext', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Social Links</CardTitle>
          <CardDescription>Manage social media links</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="telegram_link">Telegram Link</Label>
            <Input
              id="telegram_link"
              defaultValue={configMap.get('telegram_link') || ''}
              onBlur={(e) => handleUpdateConfig('telegram_link', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_email">Contact Email</Label>
            <Input
              id="contact_email"
              type="email"
              defaultValue={configMap.get('contact_email') || ''}
              onBlur={(e) => handleUpdateConfig('contact_email', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

