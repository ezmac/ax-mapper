import { createContext, useContext } from 'react'

interface OverlaySettings {
  gridSpacing: number  // feet; 0 = off
  gridOffsetX: number  // feet; shifts grid origin horizontally
  gridOffsetY: number  // feet; shifts grid origin vertically
  imageUrl: string | null
  siteW: number   // feet
  siteH: number   // feet
  scale: number   // metres per canvas unit
  showBackground: boolean
  camera: { x: number; y: number; z: number }
}

export const OverlaySettingsContext = createContext<OverlaySettings>({
  gridSpacing: 0,
  gridOffsetX: 0,
  gridOffsetY: 0,
  imageUrl: null,
  siteW: 1000,
  siteH: 600,
  scale: 0.3048,
  showBackground: true,
  camera: { x: 0, y: 0, z: 1 },
})

export function useOverlaySettings() {
  return useContext(OverlaySettingsContext)
}
