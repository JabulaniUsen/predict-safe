'use client'

import Image from 'next/image'
import {
  MELBET_HOMEPAGE_IMAGE,
  MELBET_LINK_REL,
  MELBET_MAIN_LINK,
  MELBET_PROMO_CODE,
} from '@/lib/ads/melbet'

interface MelBetHomepageBannerProps {
  /**
   * Official creative — defaults to the MelBet-supplied homepage banner
   * in `public/ads/`. Override only to test an alternate creative.
   */
  imageSrc?: string
  imageAlt?: string
}

/**
 * Homepage — standard MelBet banner (NOT hero / premium inventory).
 * Single static placement, no popups, no refresh tricks.
 * CTA: LEARN MORE → main affiliate link.
 */
export function MelBetHomepageBanner({
  imageSrc = MELBET_HOMEPAGE_IMAGE,
  imageAlt = 'MelBet — official betting partner of PredictSafe',
}: MelBetHomepageBannerProps) {
  return (
    <section aria-label="Advertisement — MelBet" className="bg-white py-4 lg:py-6">
      <div className="container mx-auto px-4">
        <p className="mb-2 text-center text-[11px] font-medium uppercase tracking-widest text-gray-400">
          Advertisement
        </p>

        {imageSrc ? (
          <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
            <a
              href={MELBET_MAIN_LINK}
              target="_blank"
              rel={MELBET_LINK_REL}
              aria-label="Learn more about MelBet (opens in new tab)"
              className="block"
            >
              <Image
                src={imageSrc}
                alt={imageAlt}
                width={1200}
                height={300}
                className="h-auto w-full object-cover"
                sizes="(max-width: 768px) 100vw, 1200px"
              />
            </a>
            <div className="flex flex-col items-center justify-between gap-3 bg-gray-50 px-5 py-3 sm:flex-row">
              <p className="text-xs text-gray-500">
                Promo code{' '}
                <span className="font-mono font-bold tracking-wider text-gray-900">
                  {MELBET_PROMO_CODE}
                </span>{' '}
                <span className="text-gray-400">· 18+ only. Bet responsibly.</span>
              </p>
              <a
                href={MELBET_MAIN_LINK}
                target="_blank"
                rel={MELBET_LINK_REL}
                className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-[#0f172a] px-8 text-sm font-extrabold uppercase tracking-wide text-white transition-all hover:bg-[#1e40af]"
              >
                Learn more
              </a>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-r from-[#0f172a] via-[#1e3a8a] to-[#0f172a] shadow-sm">
            <div className="flex flex-col items-center gap-4 px-5 py-6 sm:flex-row sm:justify-between sm:px-8 lg:px-10">
              <div className="text-center sm:text-left">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
                  Official betting partner
                </p>
                <h3 className="mt-1 text-2xl font-extrabold text-white sm:text-3xl">
                  MelBet <span className="text-amber-400">×</span> PredictSafe
                </h3>
                <p className="mt-1 text-sm text-white/80">
                  Bet on today&apos;s tips with competitive odds.{' '}
                  <span className="font-semibold text-white">
                    Promo code:{' '}
                    <span className="rounded bg-white/15 px-2 py-0.5 font-mono tracking-wider">
                      {MELBET_PROMO_CODE}
                    </span>
                  </span>
                </p>
              </div>
              <a
                href={MELBET_MAIN_LINK}
                target="_blank"
                rel={MELBET_LINK_REL}
                className="inline-flex h-12 shrink-0 items-center justify-center rounded-xl bg-amber-400 px-8 text-sm font-extrabold uppercase tracking-wide text-[#0f172a] transition-all hover:bg-amber-300"
              >
                Learn more
              </a>
            </div>
            <p className="border-t border-white/10 px-5 py-2 text-center text-[11px] text-white/50 sm:px-8 sm:text-left">
              18+ only. Bet responsibly.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
