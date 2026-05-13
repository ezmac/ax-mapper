import type { ConeData } from '../canvas/ConeData'
import type { CanvasAPI } from '../canvas/CanvasAPI'

const SECTION_COLORS = ['', '#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ec4899'] as const

interface Props {
  selectedCones: ConeData[]
  canvasAPI: CanvasAPI
}

export function SectionPanel({ selectedCones, canvasAPI }: Props) {
  const placeable = selectedCones.filter(c => c.coneType !== 'gcp' && c.coneType !== 'car_start')
  if (placeable.length === 0) return null

  const currentSection = placeable.every(c => c.section === placeable[0].section)
    ? placeable[0].section
    : undefined

  function assign(section: number | undefined) {
    for (const c of placeable) canvasAPI.updateCone(c.id, { section })
  }

  return (
    <div style={{
      position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(15,23,42,0.92)', border: '1px solid #475569',
      borderRadius: 8, padding: '6px 12px',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', gap: 7,
      color: '#94a3b8', fontSize: 12, fontWeight: 600,
      pointerEvents: 'all', zIndex: 10, whiteSpace: 'nowrap',
    }}>
      <span>Section:</span>
      {([1, 2, 3, 4, 5] as const).map(n => (
        <button
          key={n}
          onClick={() => assign(currentSection === n ? undefined : n)}
          style={{
            width: 28, height: 28, borderRadius: 4, border: '2px solid',
            background: currentSection === n ? SECTION_COLORS[n] : 'transparent',
            borderColor: SECTION_COLORS[n],
            color: currentSection === n ? 'white' : SECTION_COLORS[n],
            fontSize: 13, fontWeight: 700, cursor: 'pointer', lineHeight: 1,
          }}
        >
          {n}
        </button>
      ))}
      {currentSection !== undefined && (
        <button
          onClick={() => assign(undefined)}
          style={{
            padding: '3px 8px', borderRadius: 4, border: '1px solid #475569',
            background: 'transparent', color: '#94a3b8', fontSize: 11,
            cursor: 'pointer', fontWeight: 600,
          }}
        >
          Clear
        </button>
      )}
    </div>
  )
}
