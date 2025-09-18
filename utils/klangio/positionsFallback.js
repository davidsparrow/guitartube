// KLANGIO Details – 2025-09-17: Positions Fallback Integration
// Attempts to populate missing chord_positions via the All-Guitar-Chords scraper.
// This is a light wrapper so production code can call one function without
// directly depending on puppeteer in the main bundle.

import { adminSupabase } from '../../lib/adminSupabase.js'

export async function ensureChordPositionsForChords(chordNames) {
  const missing = []
  try {
    for (const chordName of chordNames) {
      const { data: pos, error } = await adminSupabase
        .from('chord_positions')
        .select('id')
        .eq('chord_name', chordName)
        .limit(1)
        .maybeSingle()
      if (error) {
        console.error('positionsFallback select error:', error)
        continue
      }
      if (!pos) missing.push(chordName)
    }
  } catch (e) {
    console.error('positionsFallback precheck exception:', e)
    return { attempted: 0, created: 0, missing }
  }

  if (missing.length === 0) return { attempted: 0, created: 0, missing }

  // Attempt to dynamically import the scraper (lives under docs path currently)
  // KLANGIO Details – 2025-09-17: This is best-effort; if puppeteer is not available,
  // we skip gracefully and leave positions for later batch jobs.
  try {
    const module = await import('../../docs/guitartube_branch2/song_data_processing/chord_processing/allGuitarChordsScraper.js')
    const ScraperClass = module.default
    const scraper = new ScraperClass()
    await scraper.init()

    // The scraper processes by navigating its index; here we opportunistically
    // request only the chords we need by filtering after scrape. This keeps
    // implementation minimal for now.
    const links = await scraper.scrapeMainIndex()
    const targets = links.filter(l => missing.includes(l.text))
    let created = 0
    for (const link of targets) {
      try {
        await scraper.processChord(link)
        created += 1
      } catch (e) {
        console.error('positionsFallback processChord error:', e)
      }
    }
    await scraper.close()
    return { attempted: targets.length, created, missing: missing.filter(n => !targets.find(t => t.text === n)) }
  } catch (e) {
    console.warn('positionsFallback: scraper not available or failed to run:', e?.message || e)
    return { attempted: 0, created: 0, missing }
  }
}


