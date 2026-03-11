import type { ConeData } from '../canvas/ConeData'

export interface ProjectData {
  id: string
  name: string
  cones: ConeData[]
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

class ProjectStore {
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

  getAll(): ProjectData[] {
    return this.projects
  }

  getById(id: string): ProjectData | undefined {
    return this.projects.find(p => p.id === id)
  }

  getActiveId(): string | null {
    return localStorage.getItem(ACTIVE_KEY)
  }

  setActiveId(id: string): void {
    localStorage.setItem(ACTIVE_KEY, id)
  }

  getActiveProject(): ProjectData | undefined {
    const id = this.getActiveId()
    return id ? this.getById(id) : undefined
  }

  getImage(id: string): string | null {
    return localStorage.getItem(IMAGE_PREFIX + id)
  }

  saveImage(id: string, imageUrl: string | null): void {
    if (!imageUrl) {
      localStorage.removeItem(IMAGE_PREFIX + id)
      return
    }
    try {
      localStorage.setItem(IMAGE_PREFIX + id, imageUrl)
      this.imageQuotaWarned.delete(id)  // reset if it fits now (e.g. smaller image uploaded)
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

  create(data: Omit<ProjectData, 'id' | 'createdAt' | 'updatedAt'>): string {
    const id = crypto.randomUUID()
    const now = Date.now()
    this.projects.push({ ...data, id, createdAt: now, updatedAt: now })
    this.persist()
    return id
  }

  save(
    id: string,
    patch: Omit<ProjectData, 'id' | 'createdAt' | 'updatedAt'>,
    imageUrl: string | null,
  ): void {
    const idx = this.projects.findIndex(p => p.id === id)
    if (idx === -1) return
    this.projects[idx] = { ...this.projects[idx], ...patch, updatedAt: Date.now() }
    this.persist()
    this.saveImage(id, imageUrl)
  }

  rename(id: string, name: string): void {
    const p = this.projects.find(q => q.id === id)
    if (!p) return
    p.name = name
    p.updatedAt = Date.now()
    this.persist()
  }

  /** Delete a project. Returns the id of a remaining project to activate, or null. */
  delete(id: string): string | null {
    this.projects = this.projects.filter(p => p.id !== id)
    localStorage.removeItem(IMAGE_PREFIX + id)
    this.imageQuotaWarned.delete(id)
    this.persist()
    return this.projects[0]?.id ?? null
  }
}

export const projectStore = new ProjectStore()
