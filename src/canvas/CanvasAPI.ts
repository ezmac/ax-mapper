import type { ConeData } from './ConeData'
import type { CanvasStore } from './CanvasStore'
import type { HistoryStack } from './HistoryStack'
import type Konva from 'konva'

export interface CanvasAPI {
  /** Create a placed (non-ghost) cone. Returns the new id. */
  createCone(data: Omit<ConeData, 'id' | 'isGhost'>): string

  updateCone(id: string, patch: Partial<ConeData>): void

  /** Delete placed cones, with undo/redo support. */
  deleteCones(ids: string[]): void

  getCones(): ConeData[]

  /** Batch multiple createCone calls into a single undo entry. */
  run(fn: () => void): void

  /** Replace the ghost preview set (purely visual, no history). */
  setGhosts(ghosts: Array<Omit<ConeData, 'id' | 'isGhost'>>): void

  clearGhosts(): void

  /** Current pointer position in page (canvas) coordinates. */
  getPointerPagePoint(): { x: number; y: number }
}

export function createCanvasAPI(
  store: CanvasStore,
  history: HistoryStack,
  getStage: () => Konva.Stage | null,
  onGhostsChange: (ghosts: ConeData[]) => void,
): CanvasAPI {
  return {
    createCone(data) {
      const id = crypto.randomUUID()
      store.add({ id, ...data, isGhost: false })
      return id
    },

    updateCone(id, patch) {
      store.update(id, patch)
    },

    deleteCones(ids) {
      const snapshots = ids
        .map(id => store.getById(id))
        .filter((c): c is ConeData => c !== undefined)
      store.remove(ids)
      history.push({
        undo() { for (const s of snapshots) store.add({ ...s }) },
        redo() { store.remove(ids) },
      })
    },

    getCones() {
      return store.getAll()
    },

    run(fn) {
      const before = store.snapshot()
      fn()
      const after = store.snapshot()
      history.push({
        undo() { store.restore(before) },
        redo() { store.restore(after) },
      })
    },

    setGhosts(ghosts) {
      const coneData: ConeData[] = ghosts.map((g, i) => ({
        id: `ghost_${i}`,
        isGhost: true,
        ...g,
      }))
      onGhostsChange(coneData)
    },

    clearGhosts() {
      onGhostsChange([])
    },

    getPointerPagePoint() {
      const stage = getStage()
      if (!stage) return { x: 0, y: 0 }
      const pos = stage.getPointerPosition()
      if (!pos) return { x: 0, y: 0 }
      const scale = stage.scaleX()
      const sp = stage.position()
      return {
        x: (pos.x - sp.x) / scale,
        y: (pos.y - sp.y) / scale,
      }
    },
  }
}
