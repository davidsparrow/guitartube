/**
 * Seed initial klangio_jobs row, run ingestion, and print the stored row.
 */
import dotenv from 'dotenv'
dotenv.config({ path: '../../.env.local' })

import { supabase } from '../../lib/supabase.js'
import { ingestKlangioResult } from '../../utils/klangio/ingest.js'

const JOB_ID = process.argv[2] || process.env.TEST_KLANGIO_JOB_ID || 'sim-job-seed-001'
const VIDEO_ID = process.argv[3] || 'Qyclqo_AV2M'
const YT_URL = `https://www.youtube.com/watch?v=${VIDEO_ID}`

async function main() {
  const internalRequestId = `seed-${Date.now()}`

  const init = {
    klangio_job_id: JOB_ID,
    internal_request_id: internalRequestId,
    favorite_id: null,
    video_id: VIDEO_ID,
    youtube_url: YT_URL,
    video_title: 'Test Video',
    video_channel: 'Test Channel',
    status: 'pending',
    vocabulary: 'major-minor',
    result_url: null,
    status_url: null,
    audio_url: null,
    processing_started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { error: upErr } = await supabase
    .from('klangio_jobs')
    .upsert(init, { onConflict: 'klangio_job_id' })

  if (upErr) {
    console.error('Initial upsert error:', upErr)
    process.exit(1)
  }
  console.log('Initial upsert ok')

  const ingest = await ingestKlangioResult({
    jobId: JOB_ID,
    result: [
      [0, 1, 'E:maj'],
      [1, 2, 'A:min'],
      [2, 3, 'C:maj'],
    ],
  })
  console.log('Ingest result:', ingest)

  const { data, error } = await supabase
    .from('klangio_jobs')
    .select('*')
    .eq('klangio_job_id', JOB_ID)
    .single()

  if (error) {
    console.error('Select error:', error)
    process.exit(1)
  }
  console.log('Row:', JSON.stringify(data, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})


