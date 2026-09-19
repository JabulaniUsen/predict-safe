'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

interface DeferUntilVisibleProps {
  children: ReactNode
  /**
   * Height to reserve before the section renders, so deferring doesn't make
   * the page jump as the reader scrolls into it.
   */
  minHeight?: number
  /** How far ahead of the viewport to start rendering. */
  rootMargin?: string
}

/**
 * Renders its children only once the reader is close to scrolling them into
 * view.
 *
 * The homepage mounts several independent sections that each fetch on mount -
 * predictions, VIP history, league tables, blog posts. Mounting them all at
 * once meant a burst of concurrent requests before the visitor had seen
 * anything below the fold, which is a large part of why the page took so long
 * to settle on slower connections.
 *
 * Only use this for sections whose content is fetched on the client anyway.
 * Those contribute nothing to the server-rendered HTML, so deferring them
 * costs no SEO. Anything with real content in the initial HTML should render
 * normally.
 */
export function DeferUntilVisible({
  children,
  minHeight = 320,
  rootMargin = '400px',
}: DeferUntilVisibleProps) {
  const [visible, setVisible] = useState(false)
  const placeholderRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (visible) return

    const node = placeholderRef.current
    if (!node) return

    // No IntersectionObserver (old browsers, some in-app webviews): render
    // anyway rather than leaving the section permanently blank.
    if (typeof IntersectionObserver === 'undefined') {
      const timer = setTimeout(() => setVisible(true), 0)
      return () => clearTimeout(timer)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [visible, rootMargin])

  if (visible) return <>{children}</>

  return <div ref={placeholderRef} style={{ minHeight }} aria-hidden="true" />
}
