// utils/klangio/ingest.js
// Ingest Klangio result triplets → summary (Phase 1)

import { normalizeChordName } from './normalization.js'
// KLANGIO Details – 2025-09-17: Use adminSupabase for server-side writes to bypass RLS
import { adminSupabase } from '../../lib/adminSupabase.js'
// KLANGIO Details – 2025-09-17: Optional positions fallback to populate chord_positions
import { ensureChordPositionsForChords } from './positionsFallback.js'
// KLANGIO Details – 2025-09-17: SVG generation + S3 upload for chord_positions
import { generateAndUploadSVGsForPosition } from './svgGenerator.js'

/**
 * Ingest Klangio result triplets into the database (best-effort, idempotent on job_id).
 * Phase 2: We only persist a job summary in `klangio_jobs`. Chord/caption upserts will follow.
 */
export async function ingestKlangioResult({ jobId, result }) {
  const triplets = Array.isArray(result) ? result : []
  const normalized = triplets.map(([start, end, name]) => ({ start, end, chord: normalizeChordName(name) }))
  const uniqueChords = Array.from(new Set(normalized.map(t => t.chord)))

  const summary = {
    jobId,
    tripletCount: triplets.length,
    uniqueChordCount: uniqueChords.length,
    uniqueChords,
  }

  // Persist job summary to klangio_jobs if table exists; prefer UPDATE of existing row
  try {
    // KLANGIO Details – 2025-09-17: Read via admin client to avoid RLS visibility issues
    const { data: existing, error: selErr } = await adminSupabase
      .from('klangio_jobs')
      .select('*')
      .eq('klangio_job_id', jobId)
      .single()

    if (selErr) {
      console.error('klangio_jobs select error:', selErr)
      return { ...summary, dbError: selErr.message }
    }

    if (!existing) {
      // Initial job row missing; cannot safely insert due to NOT NULL columns we do not have
      const msg = 'Initial klangio_jobs row not found for jobId; cannot persist result'
      console.error(msg)
      return { ...summary, dbError: msg }
    }

    // KLANGIO Details – 2025-09-17: Update via admin client (RLS bypass)
    const { error: updErr } = await adminSupabase
      .from('klangio_jobs')
      .update({
        status: 'finished',
        chord_triplets: triplets,
        processing_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('klangio_job_id', jobId)

    if (updErr) {
      console.error('klangio_jobs update error:', updErr)
      return { ...summary, dbError: updErr.message }
    }

    // Also persist basic chord captions (MVP) into chord_captions table
    // Idempotency: remove any prior rows created for this jobId before inserting
    try {
      const favoriteId = existing.favorite_id || null
      const captions = normalized.map((t, idx) => ({
        favorite_id: favoriteId,
        chord_name: t.chord,
        start_time: String(t.start),
        end_time: String(t.end),
        display_order: idx + 1,
        serial_number: idx + 1,
        chord_data: { source: 'klangio', job_id: jobId },
      }))

      // Delete any prior captions for this job (safe idempotency)
      // KLANGIO Details – 2025-09-17: Delete prior captions for idempotency using admin client
      await adminSupabase
        .from('chord_captions')
        .delete()
        .contains('chord_data', { job_id: jobId })

      if (captions.length > 0) {
        // KLANGIO Details – 2025-09-17: Insert captions with admin client to bypass RLS
        const { error: capErr } = await adminSupabase
          .from('chord_captions')
          .insert(captions)
        if (capErr) {
          console.error('chord_captions insert error:', capErr)
          return { ...summary, persisted: true, captionsError: capErr.message }
        }
      }
    } catch (capEx) {
      console.error('chord_captions insert exception:', capEx)
      return { ...summary, persisted: true, captionsError: capEx.message }
    }

    // KLANGIO Details – 2025-09-17: Ensure chord_variations have minimal rows for each unique chord
    // We default unknown fields safely; full enrichment happens in All-Guitar integration
    try {
      for (const chordName of uniqueChords) {
        const { data: exists, error: selVarErr } = await adminSupabase
          .from('chord_variations')
          .select('id')
          .eq('chord_name', chordName)
          .limit(1)
          .maybeSingle()
        if (selVarErr) {
          console.error('chord_variations select error:', selVarErr)
          continue
        }

        if (!exists) {
          const { rootNote, chordType } = deriveChordBasics(chordName)
          const insertPayload = {
            chord_name: chordName,
            display_name: chordName,
            root_note: rootNote,
            chord_type: chordType,
            difficulty: 'unknown',
            category: 'triad',
          }
          const { error: insVarErr } = await adminSupabase
            .from('chord_variations')
            .insert(insertPayload)
          if (insVarErr) {
            console.error('chord_variations insert error:', insVarErr, 'payload:', insertPayload)
          }
        }
      }
    } catch (varEx) {
      console.error('chord_variations ensure exception:', varEx)
    }

    // KLANGIO Details – 2025-09-17: Try to populate missing chord_positions via fallback scraper (best-effort)
    try {
      const fallback = await ensureChordPositionsForChords(uniqueChords)
      if (fallback?.attempted > 0) {
        console.log('KLANGIO positions fallback attempted:', fallback)
      }
    } catch (fallbackEx) {
      console.warn('KLANGIO positions fallback exception:', fallbackEx?.message || fallbackEx)
    }
    
    // KLANGIO Details – 2025-09-17: Link chord_captions to existing chord_positions if available
    let captionsLinked = 0
    try {
      for (const chordName of uniqueChords) {
        const { data: pos, error: selPosErr } = await adminSupabase
          .from('chord_positions')
          .select('id, chord_name, fret_position, frets, fingering, aws_svg_url_light, aws_svg_url_dark')
          .eq('chord_name', chordName)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()
        if (selPosErr) {
          console.error('chord_positions select error:', selPosErr)
          continue
        }
        if (pos?.id) {
          // KLANGIO Details – 2025-09-17: Ensure SVGs exist in S3 and update URLs if missing
          try {
            if (!pos.aws_svg_url_light || !pos.aws_svg_url_dark) {
              const urls = await generateAndUploadSVGsForPosition(pos)
              const { error: updPosErr } = await adminSupabase
                .from('chord_positions')
                .update({ aws_svg_url_light: urls.light, aws_svg_url_dark: urls.dark, updated_at: new Date().toISOString() })
                .eq('id', pos.id)
              if (updPosErr) console.error('chord_positions URL update error:', updPosErr)
            }
          } catch (svgEx) {
            console.error('SVG generation/upload error:', svgEx)
          }
          const { error: updCapErr } = await adminSupabase
            .from('chord_captions')
            .update({ chord_position_id: pos.id, fret_position: pos.fret_position || null })
            .eq('chord_name', chordName)
            .contains('chord_data', { job_id: jobId })
          if (updCapErr) {
            console.error('chord_captions link update error:', updCapErr)
          } else {
            captionsLinked += 1
          }
        }
      }
    } catch (linkEx) {
      console.error('chord_captions linking exception:', linkEx)
    }

    return { ...summary, persisted: true, captionsInserted: triplets.length, variationsEnsured: uniqueChords.length, captionsLinked }
  } catch (error) {
    console.error('klangio_jobs persist exception:', error)
    return { ...summary, dbError: error.message }
  }
}

// KLANGIO Details – 2025-09-17: Minimal chord parsing to derive root note and type
function deriveChordBasics(chordName) {
  // Normalize like: C, Cm, C#, C#m, Bb, Bbm, Fmaj7 → treat maj7 as major
  const match = chordName.match(/^(A#|Bb|C#|Db|D#|Eb|F#|Gb|G#|Ab|[A-G])([m]|m7|maj7|M7|7|sus2|sus4|add9|dim|aug)?$/i)
  const root = match ? match[1] : chordName.charAt(0)
  const qual = (match && match[2]) ? match[2].toLowerCase() : ''
  const type = qual.startsWith('m') && qual !== 'maj7' ? 'minor' : 'major'
  return { rootNote: root, chordType: type }
}


