import type { ProjectData } from './ProjectStore'

export interface IProjectStore {
  getAll(): Promise<ProjectData[]>
  getById(id: string): Promise<ProjectData | undefined>
  getActiveId(): Promise<string | null>
  setActiveId(id: string): Promise<void>
  getActiveProject(): Promise<ProjectData | undefined>
  getImage(id: string): Promise<string | null>
  saveImage(id: string, imageUrl: string | null): Promise<void>
  saveImageFile?(id: string, file: File): Promise<void>
  create(data: Omit<ProjectData, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>
  save(id: string, patch: Omit<ProjectData, 'id' | 'createdAt' | 'updatedAt'>, imageUrl: string | null): Promise<void>
  rename(id: string, name: string): Promise<void>
  delete(id: string): Promise<string | null>
}
