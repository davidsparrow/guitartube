// utils/klangio/normalization.js
// Normalize Klangio chord names to internal short names

const QUALITY_MAP = {
  'maj': '',
  'min': 'm',
  '7': '7',
  'maj7': 'maj7',
  'min7': 'm7',
  'sus2': 'sus2',
  'sus4': 'sus4',
  'dim': 'dim',
  'aug': 'aug'
}

export function normalizeChordName(klangioName) {
  if (!klangioName || typeof klangioName !== 'string') return ''
  const parts = klangioName.split(':')
  const root = parts[0]
  const quality = parts[1] || 'maj'
  const mapped = QUALITY_MAP[quality]
  if (mapped === undefined) return root.replace(/\//g, '-') // KLANGIO: 2025-09-17 - Normalize chord names: replace "/" with "-" for URL safety (e.g., "C#/Db" → "C#-Db")
  return `${root}${mapped}`.replace(/\//g, '-') // KLANGIO: 2025-09-17 - Normalize chord names: replace "/" with "-" for URL safety (e.g., "C#/Db:maj" → "C#-Db")
}


