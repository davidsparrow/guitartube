// Minimal webhook simulation to validate DB write path
import http from 'http'

function findAvailablePort(start = 34567) {
  return new Promise((resolve) => {
    const server = http.createServer().listen(start, () => {
      const { port } = server.address()
      server.close(() => resolve(port))
    })
    server.on('error', () => resolve(start + 1))
  })
}

describe('POST /api/chords/klangio/webhook', () => {
  it('should accept finished event and return success', async () => {
    const port = await findAvailablePort()
    const { default: handler } = await import('../../../pages/api/chords/klangio/webhook.js')

    const server = http.createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/api/chords/klangio/webhook') {
        let body = ''
        req.on('data', chunk => (body += chunk))
        req.on('end', async () => {
          req.body = JSON.parse(body || '{}')
          const json = {
            status: (code) => ({ json: (obj) => res.writeHead(code, { 'Content-Type': 'application/json' }).end(JSON.stringify(obj)) }),
            json: (obj) => res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(obj)),
          }
          await handler(req, json)
        })
      } else {
        res.writeHead(404).end()
      }
    })

    await new Promise(resolve => server.listen(port, resolve))

    const payload = {
      job_id: 'test-job-123',
      status: 'finished',
      result_url: '',
      status_url: '',
    }

    const resp = await fetch(`http://localhost:${port}/api/chords/klangio/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const json = await resp.json()
    expect(resp.status).toBe(200)
    expect(json.success).toBe(true)

    await new Promise(resolve => server.close(resolve))
  })
})

