import { NavbarClient } from './navbar-client'
import { getActiveMenuBacklinks } from '@/lib/affiliate-links-server'

/**
 * Site navbar — async Server Component wrapper.
 *
 * Fetches the active affiliate menu backlinks (Type = Menu Link, Link 1 /
 * Link 2 slots) on the server and hands them to the interactive
 * `NavbarClient`, so the reciprocal-link <a href> anchors are present in the
 * SSR HTML as real dofollow backlinks for crawlers and partner SEO tools.
 *
 * Client-only pages (login, signup, …) import `NavbarClient` directly and
 * fall back to a post-hydration fetch there.
 */
export async function Navbar() {
  const menuLinks = await getActiveMenuBacklinks()
  return <NavbarClient menuLinks={menuLinks} />
}
