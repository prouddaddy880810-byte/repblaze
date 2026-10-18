import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/*
 * Dev-only: serve the Vercel functions in /api through the Vite dev server so
 * `npm run dev` exercises the real lead route locally (no `vercel dev` needed).
 * Env vars come from the shell, e.g. `RESEND_API_KEY=... npm run dev`.
 * Production on Vercel ignores this plugin and runs /api/*.js as functions.
 */
function localApi() {
  return {
    name: 'repblaze-local-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost')
        const m = url.pathname.match(/^\/api\/([a-z0-9-]+)\/?$/)
        if (!m) return next()
        try {
          const mod = await server.ssrLoadModule(`/api/${m[1]}.js`)
          req.query = Object.fromEntries(url.searchParams)
          res.status = (code) => { res.statusCode = code; return res }
          res.json = (obj) => {
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify(obj))
            return res
          }
          await mod.default(req, res)
        } catch (e) {
          if (String(e?.message || '').includes('Failed to load')) return next()
          console.error('[local-api]', e)
          res.statusCode = 500
          res.end(JSON.stringify({ ok: false, error: 'LOCAL_API_ERROR' }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localApi()],
})
