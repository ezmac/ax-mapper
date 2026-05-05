import type { ConeData } from '../canvas/ConeData'
import type { PathData } from '../canvas/PathData'
import type { IProjectStore } from './IProjectStore'

export interface ProjectData {
  id: string
  name: string
  cones: ConeData[]
  paths?: PathData[]
  scale: number
  siteW: number
  siteH: number
  gridSpacing: number  // feet; 0 = off
  showBackground: boolean
  createdAt: number
  updatedAt: number
}

const PROJECTS_KEY = 'ax_mapper_projects'
const ACTIVE_KEY   = 'ax_mapper_active_project_id'
const IMAGE_PREFIX = 'ax_mapper_image_'

class ProjectStore implements IProjectStore {
  private projects: ProjectData[] = []
  private imageQuotaWarned = new Set<string>()

  constructor() {
    try {
      const raw = localStorage.getItem(PROJECTS_KEY)
      this.projects = raw ? (JSON.parse(raw) as ProjectData[]) : []
    } catch {
      this.projects = []
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(this.projects))
    } catch (err) {
      console.warn('ProjectStore: persist failed', err)
    }
  }

  async getAll(): Promise<ProjectData[]> {
    return Promise.resolve(this.projects)
  }

  async getById(id: string): Promise<ProjectData | undefined> {
    return Promise.resolve(this.projects.find(p => p.id === id))
  }

  async getActiveId(): Promise<string | null> {
    return Promise.resolve(localStorage.getItem(ACTIVE_KEY))
  }

  async setActiveId(id: string): Promise<void> {
    localStorage.setItem(ACTIVE_KEY, id)
  }

  async getActiveProject(): Promise<ProjectData | undefined> {
    const id = await this.getActiveId()
    return id ? this.getById(id) : undefined
  }

  async getImage(id: string): Promise<string | null> {
    return Promise.resolve(localStorage.getItem(IMAGE_PREFIX + id))
  }

  async saveImage(id: string, imageUrl: string | null): Promise<void> {
    if (!imageUrl) {
      localStorage.removeItem(IMAGE_PREFIX + id)
      return
    }
    try {
      localStorage.setItem(IMAGE_PREFIX + id, imageUrl)
      this.imageQuotaWarned.delete(id)
    } catch {
      localStorage.removeItem(IMAGE_PREFIX + id)
      if (!this.imageQuotaWarned.has(id)) {
        this.imageQuotaWarned.add(id)
        alert(
          'The background image is too large to save in browser storage (~5 MB limit).\n' +
          'Your cones and settings were saved, but you will need to re-upload the background image next session.'
        )
      }
    }
  }

  async create(data: Omit<ProjectData, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = crypto.randomUUID()
    const now = Date.now()
    this.projects.push({ ...data, id, createdAt: now, updatedAt: now })
    this.persist()
    return id
  }

  async save(
    id: string,
    patch: Omit<ProjectData, 'id' | 'createdAt' | 'updatedAt'>,
    imageUrl: string | null,
  ): Promise<void> {
    const idx = this.projects.findIndex(p => p.id === id)
    if (idx === -1) return
    this.projects[idx] = { ...this.projects[idx], ...patch, updatedAt: Date.now() }
    this.persist()
    await this.saveImage(id, imageUrl)
  }

  async rename(id: string, name: string): Promise<void> {
    const p = this.projects.find(q => q.id === id)
    if (!p) return
    p.name = name
    p.updatedAt = Date.now()
    this.persist()
  }

  /** Delete a project. Returns the id of a remaining project to activate, or null. */
  async delete(id: string): Promise<string | null> {
    this.projects = this.projects.filter(p => p.id !== id)
    localStorage.removeItem(IMAGE_PREFIX + id)
    this.imageQuotaWarned.delete(id)
    this.persist()
    return this.projects[0]?.id ?? null
  }
}

export const projectStore = new ProjectStore()
