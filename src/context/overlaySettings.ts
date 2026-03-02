import { createContext, useContext } from 'react'

interface OverlaySettings {
  showGrid: boolean
  imageUrl: string | null
  siteW: number   // feet
  siteH: number   // feet
  scale: number   // metres per canvas unit
  showBackground: boolean
}

export const OverlaySettingsContext = createContext<OverlaySettings>({
  showGrid: false,
  imageUrl: null,
  siteW: 1000,
  siteH: 600,
  scale: 0.3048,
  showBackground: true,
})

export function useOverlaySettings() {
  return useContext(OverlaySettingsContext)
}
