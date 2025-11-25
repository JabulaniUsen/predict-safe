# SEO Setup Documentation

This document outlines the SEO improvements implemented for PredictSafe.

## 1. Robots.txt

**Location:** `/public/robots.txt`

The robots.txt file controls which pages search engines can crawl and index.

### Allowed Pages:
- Home page (`/`)
- Blog pages (`/blog`, `/blog/[slug]`)
- Subscriptions page (`/subscriptions`)
- Match detail pages (`/match/[matchId]`)
- Public pages (FAQ, About, Terms, Privacy, etc.)

### Disallowed Pages (No Index):
- Admin pages (`/admin/*`)
- Dashboard pages (`/dashboard/*`)
- API routes (`/api/*`)
- Checkout and payment pages (`/checkout`, `/payment`)
- Login and signup pages
- Subscribe page

**Note:** Update the sitemap URL in robots.txt with your actual domain when deploying.

## 2. Sitemap

**Location:** `/app/sitemap.ts`

The sitemap is automatically generated and includes:
- All static pages with appropriate priority and change frequency
- All published blog posts
- Dynamic updates based on content

The sitemap is accessible at: `https://yourdomain.com/sitemap.xml`

## 3. Schema Markup (Structured Data)

### Organization Schema
- Added to home page via `PredictionSchema` component
- Includes organization name, logo, contact information
- Helps with Google Knowledge Graph

### Website Schema
- Includes search functionality schema
- Helps with Google search features

### Service Schema
- Describes the football prediction service
- Includes pricing and availability information

### Match Schema (SportsEvent)
- Available via `MatchSchema` component
- Can be added to match detail pages
- Includes team information, match date, league

### Prediction Schema
- Can be added to pages showing predictions
- Includes prediction type, odds, confidence level

## 4. Page Metadata

### Root Layout (`app/layout.tsx`)
- Comprehensive default metadata
- Open Graph tags for social sharing
- Twitter Card support
- Keywords array
- Robots directives

### Home Page (`app/page.tsx`)
- Optimized title and description
- Keyword-rich metadata
- Includes schema markup

### Blog Pages
- **List page:** General blog metadata
- **Individual posts:** Dynamic metadata based on post content
- Uses post excerpt, featured image, and meta keywords
- Open Graph tags for social sharing

### Match Detail Pages
- Match-specific metadata
- Keywords related to match analysis

### Subscriptions Page
- VIP and subscription-focused keywords
- Service description

### FAQ Page
- FAQ-specific keywords
- Help and support focused

### Admin & Dashboard Pages
- **Robots: noindex, nofollow**
- Prevents indexing of private/admin content
- Uses `adminMetadata` and `dashboardMetadata` utilities

## 5. Keywords Mapping

**Location:** `/lib/seo/keywords.ts`

A centralized keyword mapping system that maps keywords to specific pages:

```typescript
import { getKeywordsForPage, getPrimaryKeyword } from '@/lib/seo/keywords'

// Get keywords for a page
const keywords = getKeywordsForPage('/subscriptions')

// Get primary keyword
const primary = getPrimaryKeyword('/subscriptions')
```

### Keyword Pages:
- `/` - Free predictions, daily tips
- `/subscriptions` - VIP packages, premium predictions
- `/blog` - Betting blog, analysis
- `/match` - Match analysis, statistics
- `/faq` - Support, help questions

## 6. Implementation Guide

### Adding Schema to a Page

```tsx
import { PredictionSchema } from '@/components/seo/prediction-schema'

export default function MyPage() {
  return (
    <>
      <PredictionSchema />
      {/* Your page content */}
    </>
  )
}
```

### Adding Match Schema

```tsx
import { MatchSchema } from '@/components/seo/match-schema'

export default function MatchPage({ match, prediction }) {
  return (
    <>
      <MatchSchema match={match} prediction={prediction} />
      {/* Your page content */}
    </>
  )
}
```

### Adding Metadata to a New Page

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Page Title | PredictSafe',
  description: 'Page description for SEO',
  keywords: ['keyword1', 'keyword2', 'keyword3'],
  robots: {
    index: true,
    follow: true,
  },
}
```

### Making a Page Private (No Index)

```tsx
import type { Metadata } from 'next'
import { privatePageMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = {
  ...privatePageMetadata,
  title: 'Private Page',
}
```

## 7. Environment Variables

Make sure to set the following in your `.env.local`:

```env
NEXT_PUBLIC_SITE_URL=https://predictsafe.com
```

This is used for:
- Sitemap generation
- Open Graph URLs
- Canonical URLs

## 8. Testing SEO

### Google Search Console
1. Submit your sitemap: `https://yourdomain.com/sitemap.xml`
2. Monitor indexing status
3. Check for crawl errors

### Schema Markup Testing
- Use [Google's Rich Results Test](https://search.google.com/test/rich-results)
- Use [Schema.org Validator](https://validator.schema.org/)

### Robots.txt Testing
- Test at: `https://yourdomain.com/robots.txt`
- Use [Google Search Console Robots.txt Tester](https://support.google.com/webmasters/answer/6062598)

## 9. Best Practices

1. **Update sitemap URL** in robots.txt with your actual domain
2. **Monitor Google Search Console** for indexing issues
3. **Keep keywords relevant** - don't keyword stuff
4. **Update metadata** when content changes
5. **Use descriptive titles** - include brand name
6. **Keep descriptions** between 150-160 characters
7. **Add schema markup** to important pages
8. **Test schema** before deploying

## 10. Next Steps

1. Update `NEXT_PUBLIC_SITE_URL` in environment variables
2. Update sitemap URL in `robots.txt` with actual domain
3. Submit sitemap to Google Search Console
4. Monitor indexing and adjust as needed
5. Add more specific schema markup to prediction pages as needed

