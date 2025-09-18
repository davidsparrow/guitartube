# Klangio Chord Recognition Ingestion (Phase 1)

- Create job: POST `pages/api/chords/klangio/jobs.js`
- Webhook: POST `pages/api/chords/klangio/webhook.js`
- Utils: `utils/klangio/client.js`, `utils/klangio/normalization.js`, `utils/klangio/ingest.js`

Inputs (job): favoriteId, videoId, youtubeUrl, videoTitle?, videoChannel?
Vocabulary: major-minor.

Webhook expects: `{ job_id, status, result_url?, status_url? }`.
Phase 1 returns a summary; DB writes land in Phase 2/3.

References:
- Klangio: https://api-docs.klang.io/docs/getting-started/chord-recognition-requests
- YT→MP3 API: https://github.com/matthew-asuncion/Fast-YouTube-to-MP3-Converter-API
