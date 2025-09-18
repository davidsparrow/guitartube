// pages/api/admin/klangio/status.js
// KLANGIO Details – 2025-09-17: Admin status API for Klangio jobs → chords → positions → S3 URL status

import { adminSupabase } from '../../../../lib/adminSupabase.js'

export default async function handler(req, res) {
  // KLANGIO Details – 2025-09-17: Read-only admin endpoint; filters by jobId/videoId when provided
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { jobId, videoId, limit = 20 } = req.query || {}

    let query = adminSupabase
      .from('klangio_jobs')
      .select('id, klangio_job_id, video_id, youtube_url, status, chord_triplets, processing_started_at, processing_completed_at, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit))

    if (jobId) query = query.eq('klangio_job_id', jobId)
    if (videoId) query = query.eq('video_id', videoId)

    const { data: jobs, error: jobsErr } = await query
    if (jobsErr) throw jobsErr

    const results = []
    for (const job of jobs || []) {
      // Gather chords from captions tagged with this job_id
      const { data: chords, error: chordsErr } = await adminSupabase
        .from('chord_captions')
        .select('chord_name')
        .contains('chord_data', { job_id: job.klangio_job_id })
      if (chordsErr) throw chordsErr

      const uniqueChordNames = Array.from(new Set((chords || []).map(c => c.chord_name).filter(Boolean)))

      // For each chord, inspect positions and S3 URL status
      const chordStatuses = []
      for (const chordName of uniqueChordNames) {
        const { data: positions, error: posErr } = await adminSupabase
          .from('chord_positions')
          .select('id, chord_name, fret_position, aws_svg_url_light, aws_svg_url_dark')
          .eq('chord_name', chordName)
        if (posErr) throw posErr

        const total = positions?.length || 0
        const withLight = positions?.filter(p => !!p.aws_svg_url_light).length || 0
        const withDark = positions?.filter(p => !!p.aws_svg_url_dark).length || 0
        chordStatuses.push({ chordName, totalPositions: total, withLight, withDark })
      }

      results.push({
        job: {
          klangio_job_id: job.klangio_job_id,
          video_id: job.video_id,
          youtube_url: job.youtube_url,
          status: job.status,
          tripletsCount: Array.isArray(job.chord_triplets) ? job.chord_triplets.length : null,
          created_at: job.created_at,
          processing_started_at: job.processing_started_at,
          processing_completed_at: job.processing_completed_at,
          updated_at: job.updated_at,
        },
        chords: chordStatuses,
      })
    }

    return res.status(200).json({ success: true, count: results.length, results })
  } catch (error) {
    console.error('KLANGIO admin status error:', error)
    return res.status(500).json({ success: false, error: error.message || 'Internal Server Error' })
  }
}


