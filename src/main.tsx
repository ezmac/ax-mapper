import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { projectStore } from './services/ProjectStore.ts'
import { apiProjectStore } from './services/ApiProjectStore.ts'
import type { IProjectStore } from './services/IProjectStore.ts'
import type { ProjectData } from './services/ProjectStore.ts'

const DEFAULT_SCALE = 0.3048
const DEFAULT_SITE_W = 1000
const DEFAULT_SITE_H = 600

async function main() {
  const store: IProjectStore = import.meta.env.VITE_API_MODE === 'true'
    ? apiProjectStore
    : projectStore

  // Ensure there is always a valid active project
  let id = await store.getActiveId()
  if (!id || !(await store.getById(id))) {
    id = await store.create({
      name: 'Default Project',
      cones: [],
      scale: DEFAULT_SCALE,
      siteW: DEFAULT_SITE_W,
      siteH: DEFAULT_SITE_H,
      gridSpacing: 0,
      showBackground: true,
    })
    await store.setActiveId(id)
  }

  const initial = (await store.getActiveProject()) as ProjectData
  const initialImage = await store.getImage(initial.id)
  const projects = await store.getAll()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App
        store={store}
        initial={initial}
        initialImage={initialImage}
        projects={projects}
      />
    </StrictMode>,
  )
}

main().catch(console.error)
