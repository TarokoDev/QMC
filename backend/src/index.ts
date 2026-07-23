import cors from 'cors'
import express, { type ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'
import { categoriesRouter } from './routes/categories.js'
import { clientsRouter } from './routes/clients.js'
import { foldersRouter } from './routes/folders.js'
import { masterTemplateRouter } from './routes/master-template.js'
import { meRouter } from './routes/me.js'
import { revisionsRouter } from './routes/revisions.js'
import { settingsRouter } from './routes/settings.js'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => res.json({ ok: true }))

app.use('/api/folders', foldersRouter)
app.use('/api', categoriesRouter)
app.use('/api', clientsRouter)
app.use('/api', revisionsRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/me', meRouter)
app.use('/api/master-template', masterTemplateRouter)

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
