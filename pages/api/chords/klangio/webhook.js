// pages/api/chords/klangio/webhook.js
// Phase 1 scaffold: Klangio webhook receiver
// NOTE: New file. Does not modify existing code.

import crypto from 'crypto'
import { getKlangioResult } from '../../../../utils/klangio/client.js'
import { ingestKlangioResult } from '../../../../utils/klangio/ingest.js'

function verifySignature(req) {
  try {
    const secret = process.env.KLANGIO_WEBHOOK_SECRET || ''
    if (!secret) return true // Phase 1: allow if not configured
    const signature = req.headers['x-klangio-signature'] || ''
    const payload = JSON.stringify(req.body || {})
    const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex')
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(hmac))
  } catch {
    return false
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' })
  }

  if (!verifySignature(req)) {
    return res.status(401).json({ success: false, error: 'Invalid signature' })
  }

  try {
    const { job_id: jobId, status, result_url: resultUrl, status_url: statusUrl } = req.body || {}
    if (!jobId) {
      return res.status(400).json({ success: false, error: 'Missing job_id' })
    }

    if (status !== 'finished') {
      // Acknowledge non-final statuses to avoid retries; processing will poll if needed
      return res.status(200).json({ success: true, acknowledged: true, status })
    }

    // Fetch result triplets [start, end, chord_name]
    const result = await getKlangioResult({ jobId, resultUrl, statusUrl })

    // Ingest results: normalize chords, ensure variation/position, upsert captions (idempotent)
    const ingestSummary = await ingestKlangioResult({ jobId, result })

    return res.status(200).json({ success: true, jobId, ...ingestSummary })
  } catch (error) {
    console.error('Klangio webhook error:', error)
    return res.status(500).json({ success: false, error: error.message || 'Internal Server Error' })
  }
}


