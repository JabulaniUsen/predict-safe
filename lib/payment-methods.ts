/**
 * Shared helpers for payment-method country availability.
 *
 * A method is "available for all countries" when its `countries` field is
 * missing, NULL, a JSON null, or an empty array. Anything else must be a
 * list of country names. All user-facing filters MUST use these helpers so
 * the admin form, checkout, subscribe page and activation modal agree.
 *
 * Countries we have no local rail for (e.g. Uzbekistan) must never dead-end
 * on an empty payment screen: they fall back to cryptocurrency, which is
 * offered globally.
 */

function normalizeCountry(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').toLowerCase() : ''
}

export function getMethodCountries(method: unknown): string[] {
  const data = method as Record<string, unknown> | null | undefined
  if (!data) return []
  const countries = data.countries
  if (Array.isArray(countries)) {
    return (countries as unknown[]).filter(
      (c): c is string => typeof c === 'string' && c.trim().length > 0
    )
  }
  // Legacy single-country field (pre-015 databases)
  const legacy = data.country
  if (typeof legacy === 'string' && legacy.trim().length > 0) return [legacy]
  return []
}

export function isCryptoMethod(method: unknown): boolean {
  return (method as Record<string, unknown> | null | undefined)?.type === 'crypto'
}

export function isMethodAvailableForCountry(
  method: unknown,
  country: string | null | undefined
): boolean {
  const data = method as Record<string, unknown> | null | undefined
  // Crypto and Skrill are global by convention
  if (data?.type === 'crypto' || data?.type === 'skrill') return true
  const methodCountries = getMethodCountries(method)
  // No countries listed = available everywhere
  if (methodCountries.length === 0) return true
  const target = normalizeCountry(country)
  if (!target) return false
  return methodCountries.some((c) => normalizeCountry(c) === target)
}

/**
 * Resolve the methods to show for a country.
 *
 * Normally this is just the country match. When a country has no matching
 * method at all, it falls back to every active cryptocurrency method so the
 * user is never told "no payment methods available".
 */
export function filterMethodsForCountry<T>(
  methods: T[] | null | undefined,
  country: string | null | undefined
): T[] {
  const list = Array.isArray(methods) ? methods : []
  const matched = list.filter((method) => isMethodAvailableForCountry(method, country))
  if (matched.length > 0) return matched
  return list.filter((method) => isCryptoMethod(method))
}