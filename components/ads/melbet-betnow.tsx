'use client'

import Image from 'next/image'
import {
  MELBET_BETNOW_IMAGE,
  MELBET_LINK_REL,
  MELBET_PROMO_CODE,
  MELBET_REGISTRATION_LINK,
} from '@/lib/ads/melbet'

interface MelBetBetNowProps {
  /**
   * Official creative — defaults to the MelBet-supplied in-feed banner
   * in `public/ads/`. Override only to test an alternate creative.
   */
  imageSrc?: string
  imageAlt?: string
}

/**
 * Predictions / filter pages — in-feed BET NOW placement.
 *
 * Rules enforced by design:
 * - Rendered BETWEEN prediction groups (caller inserts it), never inside a card.
 * - One static instance per list — no popups, no repeat-on-refresh behaviour.
 * - Clearly separated + labelled as Advertisement.
 * - CTA: BET NOW / PLACE BET → direct registration affiliate link.
 */
export function MelBetBetNow({
  imageSrc = MELBET_BETNOW_IMAGE,
  imageAlt = 'MelBet — bet now with promo code PREDICTSAFE',
}: MelBetBetNowProps) {
  return (
    <aside
      aria-label="Advertisement — MelBet Bet Now"
      className="overflow-hidden rounded-xl border-2 border-dashed border-amber-400/70 bg-white shadow-sm"
    >
      <p className="bg-gray-50 py-1 text-center text-[11px] font-medium uppercase tracking-widest text-gray-400">
        Advertisement
      </p>

      {imageSrc ? (
        <div>
          <a
            href={MELBET_REGISTRATION_LINK}
            target="_blank"
            rel={MELBET_LINK_REL}
            aria-label="Bet now with MelBet (opens in new tab)"
            className="block"
          >
            <Image
              src={imageSrc}
              alt={imageAlt}
              width={1000}
              height={280}
              className="h-auto w-full object-cover"
              sizes="(max-width: 768px) 100vw, 800px"
            />
          </a>
          <div className="flex flex-col items-center justify-center gap-2 bg-gray-50 px-4 py-3 sm:flex-row">
            <a
              href={MELBET_REGISTRATION_LINK}
              target="_blank"
              rel={MELBET_LINK_REL}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-amber-400 px-8 text-sm font-extrabold uppercase tracking-wide text-[#0f172a] transition-all hover:bg-amber-300"
            >
              Bet now
            </a>
            <a
              href={MELBET_REGISTRATION_LINK}
              target="_blank"
              rel={MELBET_LINK_REL}
              className="inline-flex h-11 items-center justify-center rounded-lg border-2 border-gray-300 px-8 text-sm font-bold uppercase tracking-wide text-gray-900 transition-all hover:border-[#0f172a] hover:bg-[#0f172a] hover:text-white"
            >
              Place bet
            </a>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-[#0f172a] via-[#14532d] to-[#0f172a] px-4 py-5 text-center sm:px-6">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
            MelBet × PredictSafe
          </p>
          <h3 className="mx-auto mt-1 max-w-md text-xl font-extrabold text-white sm:text-2xl">
            Like these tips? Back them with boosted odds
          </h3>
          <p className="mt-1 text-sm text-white/80">
            Use promo code{' '}
            <span className="rounded bg-amber-400/20 px-2 py-0.5 font-mono font-bold tracking-wider text-amber-300">
              {MELBET_PROMO_CODE}
            </span>{' '}
            when you register
          </p>
          <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <a
              href={MELBET_REGISTRATION_LINK}
              target="_blank"
              rel={MELBET_LINK_REL}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-amber-400 px-8 text-sm font-extrabold uppercase tracking-wide text-[#0f172a] transition-all hover:bg-amber-300"
            >
              Bet now
            </a>
            <a
              href={MELBET_REGISTRATION_LINK}
              target="_blank"
              rel={MELBET_LINK_REL}
              className="inline-flex h-11 items-center justify-center rounded-lg border-2 border-white/40 px-8 text-sm font-bold uppercase tracking-wide text-white transition-all hover:bg-white hover:text-[#0f172a]"
            >
              Place bet
            </a>
          </div>
          <p className="mt-3 text-[11px] text-white/50">18+ only. Bet responsibly.</p>
        </div>
      )}
    </aside>
  )
}
