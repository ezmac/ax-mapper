import type { ConeData } from './ConeData'

type Listener = () => void

export class CanvasStore {
  private cones: ConeData[] = []
  private listeners: Listener[] = []

  onChange(fn: Listener): () => void {
    this.listeners.push(fn)
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn)
    }
  }

  private emit(): void {
    for (const l of this.listeners) l()
  }

  getAll(): ConeData[] {
    return this.cones
  }

  getById(id: string): ConeData | undefined {
    return this.cones.find(c => c.id === id)
  }

  add(cone: ConeData): void {
    this.cones.push(cone)
    this.emit()
  }

  update(id: string, patch: Partial<ConeData>): void {
    const i = this.cones.findIndex(c => c.id === id)
    if (i === -1) return
    this.cones[i] = { ...this.cones[i], ...patch }
    this.emit()
  }

  remove(ids: string[]): void {
    const set = new Set(ids)
    this.cones = this.cones.filter(c => !set.has(c.id))
    this.emit()
  }

  snapshot(): ConeData[] {
    return this.cones.map(c => ({ ...c }))
  }

  restore(snap: ConeData[]): void {
    this.cones = snap.map(c => ({ ...c }))
    this.emit()
  }
}
