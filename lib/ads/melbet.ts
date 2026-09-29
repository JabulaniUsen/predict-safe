/**
 * MelBet affiliate configuration (single source of truth).
 *
 * - HOMEPAGE_CTA_URL: main platform page → Homepage "LEARN MORE"
 * - REGISTRATION_CTA_URL: direct registration page → Predictions "BET NOW" / "PLACE BET"
 * - PROMO_CODE: PredictSafe promo code shown on creatives
 *
 * When MelBet supplies official graphics, drop them in `public/ads/` e.g.:
 *   public/ads/melbet-homepage.jpg
 *   public/ads/melbet-betnow.jpg
 * and pass them as `imageSrc` to the banner components — no other change needed.
 */
export const MELBET_MAIN_LINK =
  'https://refpa3665.com/L?tag=d_6089046m_2170c_&site=6089046&ad=2170'

export const MELBET_REGISTRATION_LINK =
  'https://refpa3665.com/L?tag=d_6089046m_66329c_&site=6089046&ad=66329'

export const MELBET_PROMO_CODE = 'PREDICTSAFE'

/** Official creatives (supplied by MelBet, stored in `public/ads/`). */
export const MELBET_HOMEPAGE_IMAGE = '/ads/melbet-homepage.jpg'
export const MELBET_BETNOW_IMAGE = '/ads/melbet-betnow.jpg'

/** Shared rel for affiliate outbound links. */
export const MELBET_LINK_REL = 'sponsored nofollow noopener noreferrer'
