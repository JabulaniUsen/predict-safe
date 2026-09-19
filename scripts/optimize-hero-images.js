#!/usr/bin/env node
/**
 * Regenerates the responsive hero background variants in public/hero-pics.
 *
 * Because `images.unoptimized` is on in next.config.ts (Cloudflare Images isn't
 * enabled on this hosting plan, so Next's own optimizer returns 402), the
 * browser is served exactly the file we commit. Anything dropped into
 * public/hero-pics at full camera resolution therefore ships at full camera
 * resolution - which is how the homepage ended up carrying ~12MB of
 * backgrounds. Run this after adding or replacing a hero image.
 *
 *   node scripts/optimize-hero-images.js path/to/new-hero.jpg hero-bg4
 *
 * With no arguments it regenerates every variant from the sources listed in
 * SOURCES below.
 */

const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const OUT_DIR = path.join(__dirname, '..', 'public', 'hero-pics')

// Phone width and desktop width. `sizes="100vw"` in the markup lets the browser
// pick; there's no point shipping more than 1920 for a background image.
const WIDTHS = [960, 1920]

const JPEG_OPTIONS = { quality: 72, mozjpeg: true, progressive: true }
const WEBP_OPTIONS = { quality: 70 }

async function generate(sourcePath, baseName) {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source image not found: ${sourcePath}`)
  }

  for (const width of WIDTHS) {
    const pipeline = sharp(sourcePath).resize({ width, withoutEnlargement: true })

    const jpgOut = path.join(OUT_DIR, `${baseName}-${width}.jpg`)
    const webpOut = path.join(OUT_DIR, `${baseName}-${width}.webp`)

    await pipeline.clone().jpeg(JPEG_OPTIONS).toFile(jpgOut)
    await pipeline.clone().webp(WEBP_OPTIONS).toFile(webpOut)

    const kb = (file) => `${Math.round(fs.statSync(file).size / 1024)}KB`
    console.log(`  ${path.basename(jpgOut)} ${kb(jpgOut)}   ${path.basename(webpOut)} ${kb(webpOut)}`)
  }
}

async function main() {
  const [sourceArg, nameArg] = process.argv.slice(2)

  if (sourceArg) {
    const baseName = nameArg || path.basename(sourceArg).replace(/\.[^.]+$/, '')
    console.log(`Optimizing ${sourceArg} -> ${baseName}`)
    await generate(sourceArg, baseName)
    console.log('\nReference it in components/home/hero-section.tsx as:')
    console.log(`  { base: '/hero-pics/${baseName}', alt: '...' }`)
    return
  }

  // No argument: rebuild the existing set from the largest variant we still
  // have, so the command is safe to re-run.
  const bases = ['hero', 'hero-bg1', 'hero-bg2', 'hero-bg3']
  for (const base of bases) {
    const source = path.join(OUT_DIR, `${base}-1920.jpg`)
    if (!fs.existsSync(source)) {
      console.warn(`Skipping ${base}: no ${base}-1920.jpg to rebuild from`)
      continue
    }
    console.log(`Rebuilding ${base}`)
    await generate(source, base)
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
