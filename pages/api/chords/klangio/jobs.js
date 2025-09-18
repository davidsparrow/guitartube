// pages/api/chords/klangio/jobs.js
// Phase 1 scaffold: Create Klangio chord-recognition job for a YouTube video
// NOTE: New file. Does not modify existing code.

import { createKlangioJob } from '../../../../utils/klangio/client.js'
// KLANGIO Details – 2025-09-17: Persist initial job row so webhook ingestion can UPDATE without NOT NULL issues
import { supabase } from '../../../../lib/supabase.js'
import { v4 as uuidv4 } from 'uuid'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' })
  }

  try {
    const { favoriteId, videoId, youtubeUrl, videoTitle, videoChannel } = req.body || {}

    if (!favoriteId || !videoId || !youtubeUrl) {
      return res.status(400).json({ success: false, error: 'favoriteId, videoId, youtubeUrl are required' })
    }

    // Create a tracking id for our side (not DB yet in Phase 1)
    const internalRequestId = uuidv4()

    // Phase 1: delegate to utils client to (1) obtain audio, (2) submit to Klangio (vocabulary=major-minor)
    const jobResponse = await createKlangioJob({
      favoriteId,
      videoId,
      youtubeUrl,
      videoTitle: videoTitle || '',
      videoChannel: videoChannel || '',
      vocabulary: 'major-minor',
      internalRequestId
    })

    // KLANGIO Details – 2025-09-17: Persist initial job record with required NOT NULL fields
    try {
      const { error: jobError } = await supabase
        .from('klangio_jobs')
        .upsert({
          // KLANGIO Details – 2025-09-17: Use klangio_job_id as external identifier (unique)
          klangio_job_id: jobResponse.jobId,
          // KLANGIO Details – 2025-09-17: Track request to correlate with logs and retries
          internal_request_id: internalRequestId,
          favorite_id: favoriteId || null,
          video_id: videoId,
          youtube_url: youtubeUrl,
          video_title: videoTitle || null,
          video_channel: videoChannel || null,
          status: 'pending',
          vocabulary: 'major-minor',
          result_url: null,
          status_url: jobResponse.statusUrl || null,
          audio_url: null,
          // KLANGIO Details – 2025-09-17: Start/updated timestamps for observability
          processing_started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'klangio_job_id' })
      if (jobError) {
        console.error('Failed to upsert klangio_jobs (initial):', jobError)
      }
    } catch (e) {
      console.error('klangio_jobs initial upsert exception:', e)
    }

    return res.status(200).json({ success: true, ...jobResponse })
  } catch (error) {
    console.error('Klangio job creation failed:', error)
    return res.status(500).json({ success: false, error: error.message || 'Internal Server Error' })
  }
}


