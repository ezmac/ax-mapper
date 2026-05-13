import type { ProjectData } from './ProjectStore'
import type { IProjectStore } from './IProjectStore'

const BASE = '/api'

function idToUrl(id: string): string {
  return id.split('/').map(encodeURIComponent).join('/')
}

export class ApiProjectStore implements IProjectStore {
  async getAll(): Promise<ProjectData[]> {
    const r = await fetch(`${BASE}/projects`)
    return r.json() as Promise<ProjectData[]>
  }

  async getById(id: string): Promise<ProjectData | undefined> {
    const r = await fetch(`${BASE}/projects/${idToUrl(id)}`)
    if (r.status === 404) return undefined
    return r.json() as Promise<ProjectData>
  }

  async getActiveId(): Promise<string | null> {
    const r = await fetch(`${BASE}/active`)
    const body = await r.json() as { id: string | null }
    return body.id
  }

  async setActiveId(id: string): Promise<void> {
    await fetch(`${BASE}/active`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
  }

  async getActiveProject(): Promise<ProjectData | undefined> {
    const id = await this.getActiveId()
    if (!id) return undefined
    return this.getById(id)
  }

  async getImage(id: string): Promise<string | null> {
    const r = await fetch(`${BASE}/projects/${idToUrl(id)}/image`, { method: 'HEAD' })
    if (!r.ok) return null
    return `${BASE}/projects/${idToUrl(id)}/image`
  }

  async saveImage(_id: string, _imageUrl: string | null): Promise<void> {
    // No-op: images in API mode are saved via saveImageFile()
  }

  async saveImageFile(id: string, file: File): Promise<void> {
    const form = new FormData()
    form.append('image', file)
    await fetch(`${BASE}/projects/${idToUrl(id)}/image`, {
      method: 'PUT',
      body: form,
    })
  }

  async create(data: Omit<ProjectData, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const r = await fetch(`${BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const body = await r.json() as { id: string }
    return body.id
  }

  async save(id: string, patch: Omit<ProjectData, 'id' | 'createdAt' | 'updatedAt'>, _imageUrl: string | null): Promise<void> {
    await fetch(`${BASE}/projects/${idToUrl(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...patch, id }),
    })
  }

  async rename(id: string, name: string): Promise<void> {
    const project = await this.getById(id)
    if (!project) return
    await this.save(id, { ...project, name }, null)
  }

  async delete(id: string): Promise<string | null> {
    await fetch(`${BASE}/projects/${idToUrl(id)}`, { method: 'DELETE' })
    const all = await this.getAll()
    return all[0]?.id ?? null
  }
}

export const apiProjectStore = new ApiProjectStore()
