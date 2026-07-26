import cors from 'cors'
import express, { type ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'
import { adminRouter } from './routes/admin.js'
import { authEventsRouter } from './routes/auth-events.js'
import { categoriesRouter } from './routes/categories.js'
import { clientsRouter } from './routes/clients.js'
import { demoRouter } from './routes/demo.js'
import { foldersRouter } from './routes/folders.js'
import { masterTemplateRouter } from './routes/master-template.js'
import { revisionsRouter } from './routes/revisions.js'
import { settingsRouter } from './routes/settings.js'
import { requireAuth } from './require-auth.js'

const app = express()

// Behind Vercel/Supabase the socket address is the proxy's, so `req.ip` would
// log the same address for every user in the auth event trail.
app.set('trust proxy', 1)

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => res.json({ ok: true }))

app.use('/api', requireAuth)

app.use('/api/folders', foldersRouter)
app.use('/api', categoriesRouter)
app.use('/api', clientsRouter)
app.use('/api', revisionsRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/master-template', masterTemplateRouter)
app.use('/api/demo', demoRouter)
app.use('/api/auth-events', authEventsRouter)
app.use('/api/admin', adminRouter)

app.use((req, res) => {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` })
})

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Invalid request body', issues: err.issues })
  }
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
}
app.use(errorHandler)

const port = Number(process.env.PORT) || 4000
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
})
