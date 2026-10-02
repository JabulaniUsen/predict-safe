/**
 * Shared helpers for payment-method country availability.
 *
 * A method is "available for all countries" when its `countries` field is
 * missing, NULL, a JSON null, or an empty array. Anything else must be a
 * list of country names. All user-facing filters MUST use these helpers so
 * the admin form, checkout, subscribe page and activation modal agree.
 */

export function getMethodCountries(method: unknown): string[] {
  const data = method as Record<string, unknown> | null | undefined
  if (!data) return []
  const countries = data.countries
  if (Array.isArray(countries)) {
    return (countries as unknown[]).filter(
      (c): c is string => typeof c === 'string' && c.length > 0
    )
  }
  // Legacy single-country field (pre-015 databases)
  const legacy = data.country
  if (typeof legacy === 'string' && legacy.length > 0) return [legacy]
  return []
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
  if (!country) return false
  return methodCountries.includes(country)
}
