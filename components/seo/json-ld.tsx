/**
 * Server-rendered JSON-LD. A plain <script> (not next/script): this is data,
 * not code, and it must be in the initial HTML for non-JS crawlers.
 * `<` is escaped so content from the database can't close the tag early.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
