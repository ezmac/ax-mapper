import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import type { ProjectData } from '../src/services/ProjectStore.js'
import type { ConeData, ConeType } from '../src/canvas/ConeData.js'

interface BlenderConeEntry {
  bx: number
  by: number
  type: ConeType
  size?: number
  facing_deg?: number
}

interface BlenderJson {
  transform: { type: 'scale'; scale: number; ox: number; oy: number; page_w_pt?: number; page_h_pt?: number }
  standing?: BlenderConeEntry[]
  pointers?: BlenderConeEntry[]
  timing_start?: BlenderConeEntry[]
  timing_end?: BlenderConeEntry[]
  gcp?: BlenderConeEntry[]
  stage_cone_pos?: [number, number]
}

const DEFAULT_CONE_SIZE = 2

function blenderToCones(data: BlenderJson): { cones: ConeData[]; siteW: number; siteH: number; scale: number } {
  const t = data.transform
  const { scale, ox, oy } = t

  const siteW = t.page_w_pt != null ? t.page_w_pt * scale / 0.3048 : 1000
  const siteH = t.page_h_pt != null ? t.page_h_pt * scale / 0.3048 : 600

  function toXY(bx: number, by: number) {
    return { x: (bx - ox) / scale, y: -(by - oy) / scale }
  }

  function dims(coneType: ConeType, s: number) {
    return coneType === 'pointer' ? { w: Math.round(s * 1.6), h: s } : { w: s, h: s }
  }

  let idx = 0
  const cones: ConeData[] = []

  function add(entries: BlenderConeEntry[] | undefined, coneType: ConeType) {
    for (const e of entries ?? []) {
      const { x, y } = toXY(e.bx, e.by)
      const s = e.size ?? DEFAULT_CONE_SIZE
      const rotation = coneType === 'pointer' && e.facing_deg != null
        ? -(e.facing_deg * Math.PI / 180)
        : 0
      cones.push({ id: `imported-${idx++}`, coneType, x, y, rotation, ...dims(coneType, s), isGhost: false })
    }
  }

  add(data.standing,     'standing')
  add(data.pointers,     'pointer')
  add(data.timing_start, 'timing_start')
  add(data.timing_end,   'timing_end')
  add(data.gcp,          'gcp')

  if (data.stage_cone_pos) {
    const [bx, by] = data.stage_cone_pos
    const { x, y } = toXY(bx, by)
    const s = DEFAULT_CONE_SIZE
    cones.push({ id: `imported-${idx++}`, coneType: 'car_start', x, y, rotation: 0, ...dims('car_start', s), isGhost: false })
  }

  return { cones, siteW, siteH, scale }
}

const DATA_JSON_SKIP = /_course|_merged|_chalk|_preview/

async function findDataJsonFile(dir: string): Promise<string | null> {
  let entries: import('node:fs').Dirent[]
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return null
  }
  const candidates = entries.filter(e =>
    e.isFile() &&
    e.name.endsWith('.json') &&
    e.name !== 'project.json' &&
    !DATA_JSON_SKIP.test(e.name)
  )
  if (candidates.length === 0) return null
  // Prefer the shortest name (fewest suffixes = most likely the primary file)
  candidates.sort((a, b) => a.name.length - b.name.length)
  return path.join(dir, candidates[0].name)
}

export async function readBlenderJson(dir: string, dataDir: string): Promise<ProjectData> {
  const filePath = await findDataJsonFile(dir)
  if (!filePath) throw new Error('No data JSON found')
  const raw = await fs.readFile(filePath, 'utf-8')
  const data = JSON.parse(raw) as BlenderJson
  const { cones, siteW, siteH, scale } = blenderToCones(data)
  const id = pathToId(dir, dataDir)
  const name = path.basename(dir)
  const now = Date.now()
  return { id, name, cones, scale, siteW, siteH, gridSpacing: 0, showBackground: true, createdAt: now, updatedAt: now }
}

const MIME_MAP: Record<string, string> = {
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif':  'image/gif',
}

const EXT_MAP: Record<string, string> = {
  'image/png':  '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif':  '.gif',
}

export function detectMime(ext: string): string {
  return MIME_MAP[ext.toLowerCase()] ?? 'application/octet-stream'
}

export function extForMime(mime: string): string {
  return EXT_MAP[mime] ?? '.bin'
}

// IDs use '/' as the level separator, matching the filesystem path.
// Express routes use wildcards to capture multi-segment IDs.
export function idToPath(id: string, dataDir: string): string {
  const segments = id.split('/')
  if (segments.length > 3) throw new Error(`Project id has too many levels: ${id}`)
  for (const seg of segments) {
    if (!seg || seg.includes('..')) {
      throw new Error(`Invalid path segment in project id: ${seg}`)
    }
  }
  return path.join(dataDir, ...segments)
}

export function pathToId(absPath: string, dataDir: string): string {
  const rel = path.relative(dataDir, absPath)
  return rel.split(path.sep).join('/')
}

export function synthesizeProject(dir: string, dataDir: string): ProjectData {
  const id = pathToId(dir, dataDir)
  const name = path.basename(dir)
  const now = Date.now()
  return {
    id, name,
    cones: [],
    scale: 0.3048,
    siteW: 1000,
    siteH: 600,
    gridSpacing: 0,
    showBackground: true,
    createdAt: now,
    updatedAt: now,
  }
}

export async function discoverProjects(dataDir: string): Promise<ProjectData[]> {
  const results: ProjectData[] = []

  async function walk(dir: string, depth: number) {
    if (depth > 3) return
    let entries: import('node:fs').Dirent[]
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return
    }

    const hasProjectJson = entries.some(e => e.name === 'project.json' && e.isFile())
    const hasDataJson = entries.some(e => e.isFile() && e.name.endsWith('.json') && e.name !== 'project.json')

    if (depth > 0) {
      if (hasProjectJson) {
        try {
          results.push(await readProjectJson(dir, dataDir))
        } catch {
          // skip malformed project.json
        }
      } else if (hasDataJson) {
        try {
          results.push(await readBlenderJson(dir, dataDir))
        } catch {
          results.push(synthesizeProject(dir, dataDir))
        }
      }
    }

    // Recurse into subdirs; don't go past depth 3
    if (depth < 3) {
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue
        await walk(path.join(dir, entry.name), depth + 1)
      }
    }
  }

  await walk(dataDir, 0)
  return results.sort((a, b) => a.id.localeCompare(b.id))
}

export async function readProjectJson(dir: string, dataDir: string): Promise<ProjectData> {
  const raw = await fs.readFile(path.join(dir, 'project.json'), 'utf-8')
  const data = JSON.parse(raw) as Omit<ProjectData, 'id'>
  const id = pathToId(dir, dataDir)
  return { ...data, id }
}

export async function writeProjectJson(dir: string, data: Omit<ProjectData, 'id'>): Promise<void> {
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, 'project.json'), JSON.stringify(data, null, 2), 'utf-8')
}

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif'])

export async function findImageFile(dir: string): Promise<{ filePath: string; ext: string } | null> {
  let entries: import('node:fs').Dirent[]
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return null
  }

  const images = entries
    .filter(e => e.isFile() && IMAGE_EXTS.has(path.extname(e.name).toLowerCase()))
    .map(e => ({ name: e.name, ext: path.extname(e.name).toLowerCase() }))

  // Priority: explicit background > *_map.* > *_preview.* > anything else
  const pick =
    images.find(f => path.basename(f.name, f.ext) === 'background') ??
    images.find(f => f.name.endsWith('_map' + f.ext)) ??
    images.find(f => f.name.endsWith('_preview' + f.ext)) ??
    images[0] ??
    null

  if (!pick) return null
  return { filePath: path.join(dir, pick.name), ext: pick.ext }
}

export async function deleteImageFile(dir: string): Promise<void> {
  const img = await findImageFile(dir)
  if (img) await fs.unlink(img.filePath).catch(() => {})
}

export async function getActiveId(dataDir: string): Promise<string | null> {
  try {
    const val = await fs.readFile(path.join(dataDir, 'active.txt'), 'utf-8')
    return val.trim() || null
  } catch {
    return null
  }
}

export async function setActiveId(dataDir: string, id: string): Promise<void> {
  await fs.mkdir(dataDir, { recursive: true })
  await fs.writeFile(path.join(dataDir, 'active.txt'), id, 'utf-8')
}

export function safeResolvePath(id: string, dataDir: string): string {
  const resolved = path.resolve(idToPath(id, dataDir))
  const base = path.resolve(dataDir)
  if (!resolved.startsWith(base + path.sep) && resolved !== base) {
    throw new Error('Path traversal detected')
  }
  return resolved
}
