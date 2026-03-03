import { useState, useEffect } from 'react'
import type Konva from 'konva'

type Phase = 'pick1' | 'pick2' | 'confirm'
interface Pt { x: number; y: number }

interface Props {
  active: boolean
  getStage: () => Konva.Stage | null
  onScale: (newScale: number) => void
  onClose: () => void
}

export function MeasureOverlay({ active, getStage, onScale, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('pick1')
  const [screenPt1, setScreenPt1] = useState<Pt | null>(null)
  const [screenPt2, setScreenPt2] = useState<Pt | null>(null)
  const [pagePt1, setPagePt1] = useState<Pt | null>(null)
  const [pagePt2, setPagePt2] = useState<Pt | null>(null)
  const [feet, setFeet] = useState('')

  useEffect(() => {
    if (active) {
      setPhase('pick1')
      setScreenPt1(null)
      setScreenPt2(null)
      setPagePt1(null)
      setPagePt2(null)
      setFeet('')
    }
  }, [active])

  useEffect(() => {
    if (!active) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [active, onClose])

  function screenToPage(clientX: number, clientY: number): Pt | null {
    const stage = getStage()
    if (!stage) return null
    const rect = stage.container().getBoundingClientRect()
    const scale = stage.scaleX()
    const sp = stage.position()
    return {
      x: (clientX - rect.left - sp.x) / scale,
      y: (clientY - rect.top  - sp.y) / scale,
    }
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (phase === 'confirm') return

    const rect = e.currentTarget.getBoundingClientRect()
    const overlayPt = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    const pagePt = screenToPage(e.clientX, e.clientY)
    if (!pagePt) return

    if (phase === 'pick1') {
      setScreenPt1(overlayPt)
      setPagePt1(pagePt)
      setPhase('pick2')
    } else {
      setScreenPt2(overlayPt)
      setPagePt2(pagePt)
      setPhase('confirm')
    }
  }

  function handleApply() {
    if (!pagePt1 || !pagePt2) return
    const ft = parseFloat(feet)
    if (!ft || ft <= 0) return
    const dx = pagePt2.x - pagePt1.x
    const dy = pagePt2.y - pagePt1.y
    const distUnits = Math.sqrt(dx * dx + dy * dy)
    if (distUnits === 0) return
    onScale((ft * 0.3048) / distUnits)
    onClose()
  }

  if (!active) return null

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        cursor: phase === 'confirm' ? 'default' : 'crosshair',
        zIndex: 300,
      }}
      onClick={handleClick}
    >
      {/* Line + dots */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        {screenPt1 && screenPt2 && (
          <line
            x1={screenPt1.x} y1={screenPt1.y}
            x2={screenPt2.x} y2={screenPt2.y}
            stroke="#f59e0b" strokeWidth={2} strokeDasharray="8 4"
          />
        )}
        {screenPt1 && (
          <circle cx={screenPt1.x} cy={screenPt1.y} r={6} fill="#f59e0b" stroke="white" strokeWidth={2} />
        )}
        {screenPt2 && (
          <circle cx={screenPt2.x} cy={screenPt2.y} r={6} fill="#f59e0b" stroke="white" strokeWidth={2} />
        )}
      </svg>

      {/* Instruction banner */}
      {phase !== 'confirm' && (
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(30,41,59,0.95)', color: 'white',
          borderRadius: 8, padding: '8px 18px', fontSize: 14, fontWeight: 600,
          pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>
          {phase === 'pick1' ? 'Click the first point' : 'Click the second point'}
          <span style={{ color: '#94a3b8', fontWeight: 400, marginLeft: 12, fontSize: 12 }}>Esc to cancel</span>
        </div>
      )}

      {/* Confirm dialog */}
      {phase === 'confirm' && (
        <div
          style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#1e293b', border: '1px solid #475569', borderRadius: 10,
            padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14,
            minWidth: 280, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>Set Scale</div>
          <div style={{ color: '#94a3b8', fontSize: 13 }}>
            Enter the real-world distance between the two points:
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              autoFocus
              type="number"
              min="0.1"
              step="1"
              value={feet}
              onChange={e => setFeet(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleApply() }}
              placeholder="e.g. 100"
              style={{
                background: '#334155', color: 'white',
                border: '1px solid #475569', borderRadius: 6,
                padding: '6px 10px', fontSize: 14, width: 120,
              }}
            />
            <span style={{ color: '#cbd5e1', fontSize: 14 }}>feet</span>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              style={{
                background: '#334155', color: '#94a3b8',
                border: '1px solid #475569', borderRadius: 6,
                padding: '6px 14px', fontSize: 13, cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!feet || parseFloat(feet) <= 0}
              style={{
                background: feet && parseFloat(feet) > 0 ? '#2563eb' : '#1e3a8a',
                color: 'white', border: 'none', borderRadius: 6,
                padding: '6px 14px', fontSize: 13, fontWeight: 600,
                cursor: feet && parseFloat(feet) > 0 ? 'pointer' : 'not-allowed',
              }}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
