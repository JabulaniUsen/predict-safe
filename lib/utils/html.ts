/**
 * Strips HTML tags from a string and returns plain text
 */
export function stripHtmlTags(html: string): string {
  // Remove HTML tags
  const text = html.replace(/<[^>]*>/g, '')
  // Decode HTML entities
  const tempDiv = typeof document !== 'undefined' 
    ? document.createElement('div')
    : null
  
  if (tempDiv) {
    tempDiv.innerHTML = text
    return tempDiv.textContent || tempDiv.innerText || ''
  }
  
  // Fallback for SSR: basic HTML entity decoding
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

/**
 * Get a plain text excerpt from HTML content
 */
export function getPlainTextExcerpt(html: string, maxLength: number = 150): string {
  const plainText = stripHtmlTags(html)
  if (plainText.length <= maxLength) {
    return plainText
  }
  return plainText.substring(0, maxLength).trim() + '...'
}

