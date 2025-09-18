// KLANGIO Details – 2025-09-17: Test utility to bulk-generate SVGs for a jobId or videoId
import dotenv from 'dotenv'
dotenv.config({ path: '../../.env.local' })

import { adminSupabase } from '../../lib/adminSupabase.js'
import { bulkGenerateForPositions } from '../../utils/klangio/svgGenerator.js'

const jobId = process.argv[2] || ''
const videoId = process.argv[3] || ''

async function main() {
  if (!jobId && !videoId) {
    console.log('Usage: node tests/klangio/generate_svgs_for_job.js <jobId> [videoId]')
    process.exit(1)
  }

  // KLANGIO Details – 2025-09-17: Fetch chord names for job via chord_captions
  let chordNames = []
  if (jobId) {
    const { data: caps, error: capsErr } = await adminSupabase
      .from('chord_captions')
      .select('chord_name')
      .contains('chord_data', { job_id: jobId })
    if (capsErr) {
      console.error('Fetch captions failed:', capsErr)
      process.exit(1)
    }
    chordNames = Array.from(new Set((caps || []).map(c => c.chord_name).filter(Boolean)))
  }

  let positions = []
  if (chordNames.length > 0) {
    const { data: pos, error: posErr } = await adminSupabase
      .from('chord_positions')
      .select('id, chord_name, frets, fingering, fret_position, aws_svg_url_light, aws_svg_url_dark')
      .in('chord_name', chordNames)
    if (posErr) {
      console.error('Fetch positions failed:', posErr)
      process.exit(1)
    }
    positions = pos || []
  } else if (videoId) {
    // KLANGIO Details – 2025-09-17: Simple fallback – generate for first N positions (dev use)
    const { data: pos, error: posErr } = await adminSupabase
      .from('chord_positions')
      .select('id, chord_name, frets, fingering, fret_position, aws_svg_url_light, aws_svg_url_dark')
      .limit(200)
    if (posErr) {
      console.error('Fetch positions fallback failed:', posErr)
      process.exit(1)
    }
    positions = pos || []
  }

  console.log(`Generating SVGs for ${positions.length} positions...`)
  const results = await bulkGenerateForPositions(positions)

  // Re-fetch updated URL fields for verification
  const { data: updated, error: updErr } = await adminSupabase
    .from('chord_positions')
    .select('id, chord_name, fret_position, aws_svg_url_light, aws_svg_url_dark')
    .in('id', positions.map(p => p.id))
  if (updErr) {
    console.error('Re-fetch updated URLs failed:', updErr)
    process.exit(1)
  }

  console.log(JSON.stringify({ jobId, chordNames, generatedCount: results.length, positions: updated }, null, 2))
}

main().catch(e => { console.error(e); process.exit(1) })


