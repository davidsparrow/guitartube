// components/admin/KlangioJobsPanel.js
// KLANGIO Details – 2025-09-17: Admin UI to view klangio_jobs → chords → positions → S3 status
import { useEffect, useState } from 'react'

export default function KlangioJobsPanel() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rows, setRows] = useState([])

  useEffect(() => {
    let mounted = true
    async function fetchStatus() {
      try {
        setLoading(true)
        const res = await fetch('/api/admin/klangio/status?limit=20')
        const json = await res.json()
        if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load')
        if (mounted) setRows(json.results || [])
      } catch (e) {
        if (mounted) setError(e.message)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchStatus()
    return () => { mounted = false }
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Klangio Jobs</h2>
        <p className="text-gray-600">Loading…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Klangio Jobs</h2>
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Klangio Jobs</h2>
      <div className="space-y-6">
        {rows.map((row, idx) => (
          <div key={row.job.klangio_job_id || idx} className="border rounded p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm text-gray-500">Job</div>
                <div className="font-mono text-sm break-all">{row.job.klangio_job_id}</div>
                <div className="text-sm text-gray-600">Video: <span className="font-mono">{row.job.video_id}</span></div>
                <div className="text-sm text-gray-600">Status: <span className="font-semibold">{row.job.status}</span></div>
              </div>
              <div className="mt-2 md:mt-0 text-sm text-gray-600">Triplets: {row.job.tripletsCount ?? '-'}</div>
            </div>
            <div className="mt-3 overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="pr-4 py-2">Chord</th>
                    <th className="pr-4 py-2">Positions</th>
                    <th className="pr-4 py-2">Light URLs</th>
                    <th className="pr-4 py-2">Dark URLs</th>
                  </tr>
                </thead>
                <tbody>
                  {row.chords.map((c) => (
                    <tr key={`${row.job.klangio_job_id}-${c.chordName}`} className="border-t">
                      <td className="pr-4 py-2 font-mono">{c.chordName}</td>
                      <td className="pr-4 py-2">{c.totalPositions}</td>
                      <td className="pr-4 py-2">{c.withLight}</td>
                      <td className="pr-4 py-2">{c.withDark}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


