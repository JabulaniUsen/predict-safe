'use client'

import { useEffect } from 'react'
import Script from 'next/script'
import { usePathname } from 'next/navigation'

/**
 * CleverCore ad-network loader, gated by route.
 *
 * The loader injects sticky/overlay/interstitial formats with its own
 * z-index and click handling. On mobile those layers sit on top of page
 * content and swallow taps - on /signup the first tap on "Create Account"
 * was hitting the ad layer instead of submitting the form, so the button
 * looked normal but did nothing. The same failure mode previously forced
 * the install prompt off these routes (see InstallPrompt.SUPPRESSED_PATHS).
 *
 * Conversion and account flows stay ad-free; everywhere else the loader
 * behaves exactly as before.
 */
const SUPPRESSED_PATHS = ['/login', '/signup', '/checkout', '/subscribe', '/payment', '/admin']

export function CleverCore() {
  const pathname = usePathname()
  const suppressed = SUPPRESSED_PATHS.some((path) => pathname?.startsWith(path))

  // next/script loads once per session: if the visitor already picked up the
  // loader on an ad-served page and then navigated here client-side, the
  // injected layers would otherwise persist and keep swallowing taps.
  useEffect(() => {
    if (!suppressed) return
    document
      .querySelectorAll('.clever-core-ads, .clever-core-ads-offerwall, [id^="CleverCore"]')
      .forEach((el) => el.remove())
  }, [suppressed, pathname])

  if (suppressed) return null

  return (
    <Script
      id="clever-core"
      data-cfasync="false"
      strategy="lazyOnload"
      dangerouslySetInnerHTML={{
        __html: `
              (function (document, window) {
                  var a, c = document.createElement("script"), f = window.frameElement;

                  c.id = "CleverCoreLoader105192";
                  c.src = "https://scripts.cleverwebserver.com/06cb8c09f8fdd489cf0fd19174e90600.js";

                  c.async = !0;
                  c.type = "text/javascript";
                  c.setAttribute("data-target", window.name || (f && f.getAttribute("id")));

                  try {
                      a = parent.document.getElementsByTagName("script")[0] || document.getElementsByTagName("script")[0];
                  } catch (e) {
                      a = !1;
                  }

                  a || (a = document.getElementsByTagName("head")[0] || document.getElementsByTagName("body")[0]);
                  a.parentNode.insertBefore(c, a);
              })(document, window);
            `,
      }}
    />
  )
}
