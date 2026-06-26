import { createClient } from '@/lib/supabase/server'
import { PageLayout } from '@/components/layout/page-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Football Competitions | PredictSafe',
  description: 'Browse predictions, fixtures, results, live scores and standings for the World Cup, Premier League, Champions League and more on PredictSafe.',
  robots: { index: true, follow: true },
}

interface Competition {
  id: string
  slug: string
  name: string
  featured_image: string | null
  heading: string | null
  subheading: string | null
}

export default async function CompetitionsPage() {
  const supabase = await createClient()

  const { data } = await (supabase as any)
    .from('competitions')
    .select('id, slug, name, featured_image, heading, subheading')
    .eq('status', 'active')
    .order('display_order', { ascending: true })

  const competitions = (data as Competition[]) || []

  return (
    <PageLayout
      title="Competitions"
      subtitle="Predictions, fixtures, results, live scores and standings for every major competition."
    >
      <div className="container mx-auto px-4 py-8 lg:py-16">
        {competitions.length === 0 ? (
          <div className="text-center py-12 lg:py-20">
            <p className="text-lg lg:text-xl text-gray-500">No competitions available yet.</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {competitions.map((competition) => (
              <Card
                key={competition.id}
                className="overflow-hidden border-2 border-gray-200 hover:border-[#22c55e] hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex flex-col"
              >
                {competition.featured_image && (
                  <div className="relative h-40 w-full">
                    <Image
                      src={competition.featured_image}
                      alt={competition.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <CardHeader className="bg-white p-4 lg:p-6 flex-1">
                  <CardTitle className="text-lg lg:text-xl font-bold text-[#1e40af] mb-2">
                    {competition.heading || competition.name}
                  </CardTitle>
                  {competition.subheading && (
                    <CardDescription className="text-sm lg:text-base text-gray-600">
                      {competition.subheading}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="bg-gray-50 p-4 lg:p-6">
                  <Button
                    asChild
                    className="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] hover:from-[#1e3a8a] hover:to-[#1e40af] text-white font-bold text-sm lg:text-base w-full"
                  >
                    <Link href={`/competitions/${competition.slug}`}>View Competition</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  )
}
