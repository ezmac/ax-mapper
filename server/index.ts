// Keep the process alive even when stdin is closed (e.g. under npm run)
process.stdin.resume()

import express from 'express'
import cors from 'cors'
import multer from 'multer'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import {
  discoverProjects,
  readProjectJson,
  readBlenderJson,
  writeProjectJson,
  synthesizeProject,
  findImageFile,
  deleteImageFile,
  getActiveId,
  setActiveId,
  safeResolvePath,
  detectMime,
  extForMime,
  pathToId,
} from './projectFs.js'
import type { ProjectData } from '../src/services/ProjectStore.js'

const DATA_DIR = path.resolve(process.env.DATA_DIR ?? './data')
const PORT = parseInt(process.env.SERVER_PORT ?? '3001', 10)

const app = express()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } })

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/projects', async (_req, res) => {
  try {
    const projects = await discoverProjects(DATA_DIR)
    res.json(projects)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// Image sub-routes registered before generic project routes (regex order matters).
app.get(/^\/api\/projects\/(.+)\/image$/, async (req, res) => {
  try {
    const dir = safeResolvePath(req.params[0] as string, DATA_DIR)
    const img = await findImageFile(dir)
    if (!img) {
      res.status(404).json({ error: 'No image' })
      return
    }
    res.setHeader('Content-Type', detectMime(img.ext))
    res.setHeader('Cache-Control', 'no-cache')
    const buf = await fs.readFile(img.filePath)
    res.end(buf)
  } catch (err) {
    res.status(400).json({ error: String(err) })
  }
})

app.put(/^\/api\/projects\/(.+)\/image$/, upload.single('image'), async (req, res) => {
  try {
    const dir = safeResolvePath(req.params[0] as string, DATA_DIR)
    const file = req.file
    if (!file) {
      res.status(400).json({ error: 'No image file provided' })
      return
    }
    const ext = extForMime(file.mimetype) || path.extname(file.originalname) || '.bin'
    await deleteImageFile(dir)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path.join(dir, `background${ext}`), file.buffer)
    res.json({ ok: true })
  } catch (err) {
    res.status(400).json({ error: String(err) })
  }
})

app.get(/^\/api\/projects\/(.+)$/, async (req, res) => {
  try {
    const dir = safeResolvePath(req.params[0] as string, DATA_DIR)
    try {
      const data = await readProjectJson(dir, DATA_DIR)
      res.json(data)
    } catch {
      try {
        const data = await readBlenderJson(dir, DATA_DIR)
        res.json(data)
      } catch {
        try {
          await fs.access(dir)
          res.json(synthesizeProject(dir, DATA_DIR))
        } catch {
          res.status(404).json({ error: 'Project not found' })
        }
      }
    }
  } catch (err) {
    res.status(400).json({ error: String(err) })
  }
})

app.put(/^\/api\/projects\/(.+)$/, async (req, res) => {
  try {
    const dir = safeResolvePath(req.params[0] as string, DATA_DIR)
    const { id: _id, createdAt, updatedAt, ...rest } = req.body as ProjectData
    const patch: Omit<ProjectData, 'id'> = {
      ...rest,
      createdAt: createdAt ?? Date.now(),
      updatedAt: Date.now(),
    }
    await writeProjectJson(dir, patch)
    res.json({ ok: true })
  } catch (err) {
    res.status(400).json({ error: String(err) })
  }
})

app.post('/api/projects', async (req, res) => {
  try {
    const { name } = req.body as { name: string }
    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'name is required' })
      return
    }

    // name may use '/' to indicate nesting (e.g. "2025/spring")
    // or be a flat name which becomes a single-level folder
    const segments = name.trim().split('/').map(s => s.trim()).filter(Boolean)
    if (segments.length === 0 || segments.length > 3) {
      res.status(400).json({ error: 'Project name must have 1-3 path segments (separated by /)' })
      return
    }
    for (const seg of segments) {
      if (!/^[a-zA-Z0-9_.() -]+$/.test(seg)) {
        res.status(400).json({ error: `Invalid characters in segment: ${seg}` })
        return
      }
    }

    const dir = path.join(DATA_DIR, ...segments)
    const resolved = path.resolve(dir)
    const base = path.resolve(DATA_DIR)
    if (!resolved.startsWith(base + path.sep)) {
      res.status(400).json({ error: 'Invalid path' })
      return
    }

    // Check not already exists
    try {
      await fs.access(path.join(dir, 'project.json'))
      res.status(409).json({ error: 'Project already exists' })
      return
    } catch { /* doesn't exist, good */ }

    const now = Date.now()
    await writeProjectJson(dir, {
      name,
      cones: [],
      scale: 0.3048,
      siteW: 1000,
      siteH: 600,
      gridSpacing: 0,
      showBackground: true,
      createdAt: now,
      updatedAt: now,
    })

    const id = pathToId(resolved, DATA_DIR)
    res.status(201).json({ id })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

app.delete(/^\/api\/projects\/(.+)$/, async (req, res) => {
  try {
    const dir = safeResolvePath(req.params[0] as string, DATA_DIR)
    await fs.rm(dir, { recursive: true, force: true })
    res.status(204).end()
  } catch (err) {
    res.status(400).json({ error: String(err) })
  }
})

app.get('/api/active', async (_req, res) => {
  try {
    const id = await getActiveId(DATA_DIR)
    res.json({ id })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

app.put('/api/active', async (req, res) => {
  try {
    const { id } = req.body as { id: string }
    await setActiveId(DATA_DIR, id)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

fs.mkdir(DATA_DIR, { recursive: true }).then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AX Mapper API server running on http://0.0.0.0:${PORT}`)
    console.log(`Data directory: ${DATA_DIR}`)
  })
})
