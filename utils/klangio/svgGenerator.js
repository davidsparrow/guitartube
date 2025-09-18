// KLANGIO Details – 2025-09-17: SVG generation + S3 upload helpers (production-safe)
// Generates light/dark SVGs for a chord position and uploads to S3, then
// returns the URLs so callers can persist them on chord_positions.

import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { renderChord as renderCustomSVG } from '../../song_data_processing/chord_processing/chordRenderer.js'
import { generateS3Key as generateS3KeyNew, generateChordURL as generateURLNew } from '../../scripts/chord_naming_convention.js'

// Prefer env vars; falls back to us-west-2 bucket from config docs
const AWS_REGION = process.env.AWS_REGION || 'us-west-2'
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || 'guitarmagic-chord-library'

function getS3Client() {
  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) throw new Error('Missing AWS credentials')
  return new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  })
}

async function headObjectSafe(client, key) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: S3_BUCKET_NAME, Key: key }))
    return true
  } catch (e) {
    return false
  }
}

export async function generateAndUploadSVGsForPosition(position) {
  // position: { chord_name, frets, fingering, fret_position }
  const chordName = position.chord_name
  const fretStartNumber = parseInt(String(position.fret_position || 'pos1').replace('pos', '')) || 1

  const client = getS3Client()
  const themes = ['lt', 'dk']
  const urls = {}

  for (const theme of themes) {
    // theme mapping for renderer
    const rendererTheme = theme === 'lt' ? 'light' : 'dark'

    // Generate SVG using custom renderer from song_data_processing
    const svg = renderCustomSVG({
      strings: ['E', 'A', 'D', 'G', 'B', 'E'],
      frets: position.frets,
      fingering: position.fingering,
      chord_name: chordName,
    }, 'open', rendererTheme)

    // Naming per scripts/chord_naming_convention.js
    const key = generateS3KeyNew(chordName, fretStartNumber, theme)
    const url = generateURLNew(chordName, fretStartNumber, theme)

    const exists = await headObjectSafe(client, key)
    if (!exists) {
      const put = new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
        Body: Buffer.from(svg, 'utf8'),
        ContentType: 'image/svg+xml',
        CacheControl: 'public, max-age=31536000',
        Metadata: {
          'chord-name': chordName,
          'fret-start': String(fretStartNumber),
          theme,
          'generated-at': new Date().toISOString(),
        },
      })
      await client.send(put)
    }
    urls[theme === 'lt' ? 'light' : 'dark'] = url
  }

  return urls
}

export async function bulkGenerateForPositions(positions) {
  const results = []
  for (const pos of positions) {
    try {
      const urls = await generateAndUploadSVGsForPosition(pos)
      results.push({ id: pos.id, chord_name: pos.chord_name, urls })
    } catch (e) {
      results.push({ id: pos.id, chord_name: pos.chord_name, error: e.message })
    }
  }
  return results
}


