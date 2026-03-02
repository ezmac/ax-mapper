import { createContext, useContext } from 'react'

interface OverlaySettings {
  showGrid: boolean
  imageUrl: string | null
  siteW: number
  siteH: number
  showBackground: boolean
}

export const OverlaySettingsContext = createContext<OverlaySettings>({
  showGrid: false,
  imageUrl: null,
  siteW: 1000,
  siteH: 600,
  showBackground: true,
})

export function useOverlaySettings() {
  return useContext(OverlaySettingsContext)
}
