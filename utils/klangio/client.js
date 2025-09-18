// utils/klangio/client.js
// Phase 1 client wrappers for Klangio job lifecycle

import { getAudioUrlFromYouTube } from './youtubeAudio.js'

export async function createKlangioJob({ favoriteId, videoId, youtubeUrl, videoTitle = '', videoChannel = '', vocabulary = 'major-minor', internalRequestId = '', audioUrl = '' }) {
  if (!process.env.KLANGIO_API_KEY) throw new Error('Missing KLANGIO_API_KEY')

  let resolvedAudioUrl = audioUrl
  if (!resolvedAudioUrl) {
    // Try to extract audio from YouTube URL
    try {
      resolvedAudioUrl = await getAudioUrlFromYouTube(youtubeUrl)
    } catch (error) {
      throw new Error(`Failed to extract audio from YouTube: ${error.message}`)
    }
  }

  const webhookUrl = process.env.KLANGIO_WEBHOOK_URL || ''

  let audioBlob;
  
  // Check if it's a local file path or URL
  if (resolvedAudioUrl.startsWith('http')) {
    // It's a URL, fetch it
    const audioResp = await fetch(resolvedAudioUrl)
    if (!audioResp.ok) throw new Error(`Failed to fetch audio: ${audioResp.status}`)
    audioBlob = await audioResp.blob()
  } else {
    // It's a local file path, read it directly
    const fs = await import('fs');
    const audioBuffer = fs.readFileSync(resolvedAudioUrl);
    audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
  }

  const form = new FormData()
  form.append('file', audioBlob, 'audio.mp3')
  if (webhookUrl) form.append('webhook_url', webhookUrl)

  const resp = await fetch(`https://api.klang.io/chord-recognition?vocabulary=${vocabulary}`, {
    method: 'POST',
    headers: { 'kl-api-key': process.env.KLANGIO_API_KEY },
    body: form
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`Klangio create failed: ${resp.status} ${text}`)
  }
  const json = await resp.json()

  return {
    jobId: json.job_id,
    statusUrl: json.status_endpoint_url,
    favoriteId,
    videoId,
    youtubeUrl,
    vocabulary,
    internalRequestId,
  }
}

export async function getKlangioResult({ jobId, resultUrl = '', statusUrl = '' }) {
  const url = resultUrl || statusUrl
  if (!url) return []

  const resp = await fetch(url, {
    headers: process.env.KLANGIO_API_KEY ? { 'kl-api-key': process.env.KLANGIO_API_KEY } : undefined
  })
  if (!resp.ok) throw new Error(`Failed to fetch Klangio result: ${resp.status}`)
  const json = await resp.json().catch(() => null)
  if (Array.isArray(json)) return json
  if (json && Array.isArray(json.result)) return json.result
  return []
}


