import type { Metadata } from 'next'
import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { ExternalLinkPlacement } from '@/components/seo/external-link-placement'
import { getActivePartnerLinks } from '@/lib/affiliate-links-server'
import { LINK_PLACEMENTS } from '@/lib/link-partnerships'

export const metadata: Metadata = {
  title: 'Our Partners & Recommended Platforms',
  description:
    'PredictSafe link partners and recommended football prediction platforms. Genuine partnerships with trusted prediction sites.',
  alternates: { canonical: '/partners' },
}

// Revalidate periodically so newly activated partnerships appear without a redeploy.
export const revalidate = 3600

export default async function PartnersPage() {
  // Affiliate links with Type = Partners (Admin → Affiliate Links).
  // Server-rendered dofollow backlinks, same SEO rules as the navbar slots.
  const partnerLinks = await getActivePartnerLinks()

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold mb-4">Our Partners & Recommended Platforms</h1>
        <p className="text-muted-foreground mb-10">
          The football prediction sites and platforms we partner with. Each link below is a
          genuine partnership link published on PredictSafe.
        </p>

        {partnerLinks.length > 0 && (
          <section className="rounded-lg border p-6 mb-10">
            <h4 className="text-lg font-bold mb-4 text-gray-900">Partners</h4>
            <ul className="space-y-2">
              {partnerLinks.map((link) => (
                <li key={link.id}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener"
                    className="text-blue-600 hover:underline"
                  >
                    {link.title}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="space-y-10">
          {LINK_PLACEMENTS.map((placement) => (
            <section key={placement.value}>
              {/* Server-rendered placement: real <a href> anchors in the HTML for crawlers. */}
              <ExternalLinkPlacement
                placement={placement.value}
                title={placement.label}
                className="rounded-lg border p-6 [&_h4]:text-gray-900 [&_ul]:space-y-2"
                linkClassName="text-blue-600 hover:underline"
              />
            </section>
          ))}
        </div>

        <p className="mt-10 text-sm text-muted-foreground">
          Interested in a reciprocal link partnership with PredictSafe?{' '}
          <Link href="/contact" className="text-blue-600 hover:underline">
            Contact us
          </Link>
          .
        </p>
      </main>
      <Footer />
    </div>
  )
}
