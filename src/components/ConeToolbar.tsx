import { useState } from 'react'
import { useEditor } from 'tldraw'
import { SlalomTool } from '../tools/SlalomTool'
import { PointerPairTool } from '../tools/PointerPairTool'
import { coneSettings } from '../settings'
import { renderCone } from '../shapes/ConeShapeUtil'
import type { ConeShape } from '../types/cone'

// ─── mini SVG icon helpers ────────────────────────────────────────────────────

type ConeT = ConeShape['props']['coneType']

/** Single cone rendered as a small SVG for toolbar buttons. */
function MiniCone({ type, size = 14 }: { type: ConeT; size?: number }) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {renderCone(type, size, size)}
    </svg>
  )
}

/** Two cones side-by-side for compound tool icons. */
function MiniPair({ left, right, size = 12 }: { left: ConeT; right: ConeT; size?: number }) {
  const gap = 2
  const total = size * 2 + gap
  return (
    <svg width={total} height={size} viewBox={`0 0 ${total} ${size}`}>
      {renderCone(left, size, size)}
      <g transform={`translate(${size + gap}, 0)`}>
        {renderCone(right, size, size)}
      </g>
    </svg>
  )
}

/** Row of N identical cones for the slalom icon. */
function MiniSlalom({ n, size = 6 }: { n: number; size?: number }) {
  const gap = 2
  const total = n * size + (n - 1) * gap
  return (
    <svg width={total} height={size} viewBox={`0 0 ${total} ${size}`}>
      {Array.from({ length: n }, (_, i) => (
        <g key={i} transform={`translate(${i * (size + gap)}, 0)`}>
          {renderCone('standing', size, size)}
        </g>
      ))}
    </svg>
  )
}

// ─── toolbar primitives ───────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 700, color: '#9ca3af',
      textTransform: 'uppercase', letterSpacing: '0.06em',
      padding: '6px 2px 2px',
    }}>
      {children}
    </div>
  )
}

function ToolBtn({
  icon, label, active, onClick,
}: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 2, padding: '5px 2px', width: '100%', border: 'none',
        borderRadius: 6,
        background: active ? '#dbeafe' : 'transparent',
        outline: active ? '2px solid #2563eb' : '2px solid transparent',
        cursor: 'pointer', color: active ? '#1d4ed8' : '#374151',
        fontWeight: active ? 600 : 400,
      }}
    >
      <span style={{ lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: 9, lineHeight: 1.2 }}>{label}</span>
    </button>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

export function ConeToolbar() {
  const editor = useEditor()
  const [activeTool, setActiveTool] = useState('select')
  const [slalomCount, setSlalomCount] = useState(5)
  const [ptrCount, setPtrCount] = useState(1)
  const [coneSize, setConeSize] = useState(coneSettings.size)

  function focusCanvas() {
    editor.getContainer().focus()
  }

  function activate(toolId: string) {
    editor.setCurrentTool(toolId)
    setActiveTool(toolId)
    focusCanvas()
  }

  function activatePtrPair(n: number) {
    PointerPairTool.pointerCount = n
    setPtrCount(n)
    editor.setCurrentTool('pointer-pair')
    setActiveTool('pointer-pair')
    focusCanvas()
  }

  function activateSlalom(n: number) {
    SlalomTool.coneCount = n
    setSlalomCount(n)
    editor.setCurrentTool('slalom')
    setActiveTool('slalom')
    focusCanvas()
  }

  function handleSizeChange(val: number) {
    coneSettings.size = val
    setConeSize(val)
  }

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <div
        onPointerDown={e => e.stopPropagation()}
        style={{
          position: 'absolute', left: 8, top: 8, bottom: 8, width: 72,
          background: 'white', border: '1px solid #e5e7eb', borderRadius: 8,
          padding: '4px', display: 'flex', flexDirection: 'column', gap: 1,
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          overflowY: 'auto', pointerEvents: 'all', zIndex: 300,
        }}
      >
        <SectionLabel>Tools</SectionLabel>

        <ToolBtn
          icon={<span style={{ fontSize: 14 }}>↖</span>}
          label="Select" active={activeTool === 'select'}
          onClick={() => activate('select')}
        />
        <ToolBtn
          icon={<MiniCone type="standing" />}
          label="Standing" active={activeTool === 'standing-cone'}
          onClick={() => activate('standing-cone')}
        />
        <ToolBtn
          icon={<MiniCone type="pointer" />}
          label="Pointer" active={activeTool === 'pointer-cone'}
          onClick={() => activate('pointer-cone')}
        />
        <ToolBtn
          icon={<MiniCone type="timing_start" />}
          label="Tmg Start" active={activeTool === 'timing-start'}
          onClick={() => activate('timing-start')}
        />
        <ToolBtn
          icon={<MiniCone type="timing_end" />}
          label="Tmg End" active={activeTool === 'timing-end'}
          onClick={() => activate('timing-end')}
        />
        <ToolBtn
          icon={<MiniCone type="gcp" />}
          label="GCP" active={activeTool === 'gcp'}
          onClick={() => activate('gcp')}
        />

        <SectionLabel>Compound</SectionLabel>

        <ToolBtn
          icon={<MiniPair left="standing" right="standing" />}
          label="Gate" active={activeTool === 'gate'}
          onClick={() => activate('gate')}
        />
        <ToolBtn
          icon={<MiniPair left="timing_start" right="timing_end" />}
          label="Tmg Gate" active={activeTool === 'timing-gate'}
          onClick={() => activate('timing-gate')}
        />
        <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 2px 2px' }}>
          Ptr Pair
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 2 }}>
          {[1, 2, 3, 4].map(n => (
            <button
              key={n}
              onClick={() => activatePtrPair(n)}
              title={`${n} pointer${n > 1 ? 's' : ''}`}
              style={{
                padding: '3px 0', border: 'none', borderRadius: 4,
                background: activeTool === 'pointer-pair' && ptrCount === n ? '#dbeafe' : '#f3f4f6',
                outline: activeTool === 'pointer-pair' && ptrCount === n ? '2px solid #2563eb' : '2px solid transparent',
                cursor: 'pointer', fontSize: 11, fontWeight: 600,
                color: activeTool === 'pointer-pair' && ptrCount === n ? '#1d4ed8' : '#374151',
              }}
            >
              {n}
            </button>
          ))}
        </div>

        <SectionLabel>Slalom</SectionLabel>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          {[3, 4, 5, 6, 7, 8].map(n => (
            <button
              key={n}
              onClick={() => activateSlalom(n)}
              title={`${n}-cone slalom`}
              style={{
                padding: '3px 0', border: 'none', borderRadius: 4,
                background: activeTool === 'slalom' && slalomCount === n ? '#dbeafe' : '#f3f4f6',
                outline: activeTool === 'slalom' && slalomCount === n ? '2px solid #2563eb' : '2px solid transparent',
                cursor: 'pointer', fontSize: 11, fontWeight: 600,
                color: activeTool === 'slalom' && slalomCount === n ? '#1d4ed8' : '#374151',
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2px 0' }}>
          <MiniSlalom n={Math.min(slalomCount, 5)} />
        </div>

        {/* ── cone size control ── */}
        <SectionLabel>Size</SectionLabel>
        <div style={{ padding: '0 2px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <input
            type="range"
            min={3} max={48} step={1}
            value={coneSize}
            onChange={e => handleSizeChange(Number(e.target.value))}
            style={{ width: '100%', cursor: 'pointer' }}
          />
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', fontSize: 9, color: '#6b7280',
          }}>
            <span>3</span>
            <span style={{ fontWeight: 700, color: '#374151', fontSize: 11 }}>{coneSize}</span>
            <span>48</span>
          </div>
        </div>
      </div>
    </div>
  )
}
