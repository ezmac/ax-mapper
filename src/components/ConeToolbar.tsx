import { useState } from 'react'
import type { ToolManager } from '../canvas/ToolManager'
import { SlalomTool } from '../tools/SlalomTool'
import { PointerPairTool } from '../tools/PointerPairTool'
import { coneSettings } from '../settings'

// ─── mini SVG icon helpers ────────────────────────────────────────────────────

type ConeT = 'standing' | 'pointer' | 'timing_start' | 'timing_end' | 'gcp' | 'car_start'

const C_ORANGE  = '#FF8C00'
const C_MAGENTA = '#FF00FF'
const C_GREEN   = '#22c55e'
const C_RED     = '#ef4444'
const C_BLUE    = '#3b82f6'
const C_YELLOW  = '#F59E0B'

function renderMiniCone(type: ConeT, w: number, h: number) {
  const r = Math.min(w, h) * 0.12
  switch (type) {
    case 'standing':   return <rect x={0} y={0} width={w} height={h} rx={r} fill={C_ORANGE} />
    case 'timing_start': return <rect x={0} y={0} width={w} height={h} rx={r} fill={C_GREEN} />
    case 'timing_end': return <rect x={0} y={0} width={w} height={h} rx={r} fill={C_RED} />
    case 'pointer':    return <polygon points={`${w},${h/2} 0,0 0,${h}`} fill={C_MAGENTA} />
    case 'gcp': {
      const cx = w/2, cy = h/2, rad = Math.min(w,h)/2*0.92
      return <><circle cx={cx} cy={cy} r={rad} fill={C_BLUE} /><circle cx={cx} cy={cy} r={rad*0.3} fill="white" /></>
    }
    case 'car_start':
      return <polygon points={`${w},${h/2} ${w*0.65},0 0,0 0,${h} ${w*0.65},${h}`} fill={C_YELLOW} />
  }
}

function MiniCone({ type, size = 14 }: { type: ConeT; size?: number }) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {renderMiniCone(type, size, size)}
    </svg>
  )
}

function MiniPair({ left, right, size = 12 }: { left: ConeT; right: ConeT; size?: number }) {
  const gap = 2
  const total = size * 2 + gap
  return (
    <svg width={total} height={size} viewBox={`0 0 ${total} ${size}`}>
      {renderMiniCone(left, size, size)}
      <g transform={`translate(${size + gap}, 0)`}>{renderMiniCone(right, size, size)}</g>
    </svg>
  )
}

function MiniPointerPair({ size = 10 }: { size?: number }) {
  const pw = Math.round(size * 1.5)
  const gap = 2
  const total = size + gap + pw
  return (
    <svg width={total} height={size} viewBox={`0 0 ${total} ${size}`}>
      {renderMiniCone('standing', size, size)}
      <g transform={`translate(${size + gap + pw}, 0) scale(-1, 1)`}>
        {renderMiniCone('pointer', pw, size)}
      </g>
    </svg>
  )
}

function MiniSlalom({ n = 4, size = 5 }: { n?: number; size?: number }) {
  const display = Math.min(n, 5)
  const gap = 2
  const h = display * size + (display - 1) * gap
  return (
    <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`}>
      {Array.from({ length: display }, (_, i) => (
        <g key={i} transform={`translate(0, ${i * (size + gap)})`}>
          {renderMiniCone('standing', size, size)}
        </g>
      ))}
    </svg>
  )
}

function MiniAlign({ size = 14 }: { size?: number }) {
  const r = size * 0.14
  const y = size / 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <line x1={r} y1={y} x2={size - r} y2={y} stroke="#9ca3af" strokeWidth={1} />
      <circle cx={r}        cy={y} r={r} fill={C_ORANGE} />
      <circle cx={size / 2} cy={y} r={r} fill={C_MAGENTA} />
      <circle cx={size - r} cy={y} r={r} fill={C_ORANGE} />
    </svg>
  )
}

function MiniChute({ rows = 4, size = 5 }: { rows?: number; size?: number }) {
  const gap = 5
  const rowSpacing = size + 2
  const w = size * 2 + gap
  const h = rows * rowSpacing - 2
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {Array.from({ length: rows }, (_, i) => (
        <g key={i} transform={`translate(0, ${i * rowSpacing})`}>
          {renderMiniCone('standing', size, size)}
          <g transform={`translate(${size + gap}, 0)`}>{renderMiniCone('standing', size, size)}</g>
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

function CountInput({ value, min = 1, max = 12, onChange }: {
  value: number; min?: number; max?: number; onChange: (n: number) => void
}) {
  const btnStyle: React.CSSProperties = {
    width: 18, height: 18, border: '1px solid #d1d5db', borderRadius: 4,
    background: '#f3f4f6', cursor: 'pointer', fontSize: 13, lineHeight: 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, padding: 0, color: '#374151',
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '1px 2px' }}>
      <button style={btnStyle} onClick={() => onChange(Math.max(min, value - 1))}>−</button>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={e => {
          const v = parseInt(e.target.value)
          if (!isNaN(v) && v >= min && v <= max) onChange(v)
        }}
        onFocus={e => e.target.select()}
        style={{
          width: 26, textAlign: 'center', fontSize: 11, fontWeight: 700,
          border: '1px solid #d1d5db', borderRadius: 4, padding: '1px 0',
          background: 'white', color: '#111827',
          MozAppearance: 'textfield',
        } as React.CSSProperties}
      />
      <button style={btnStyle} onClick={() => onChange(Math.min(max, value + 1))}>+</button>
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

interface Props {
  toolManager: ToolManager | null
  onSizeChange?: (newSize: number) => void
  onAlign?: () => void
}

export function ConeToolbar({ toolManager, onSizeChange, onAlign }: Props) {
  const [activeTool, setActiveTool] = useState<string | null>(null)
  const [slalomCount, setSlalomCount] = useState(SlalomTool.coneCount)
  const [ptrCount, setPtrCount] = useState(PointerPairTool.pointerCount)
  const [coneSize, setConeSize] = useState(coneSettings.size)

  function activate(toolId: string | null) {
    toolManager?.setTool(toolId)
    setActiveTool(toolId)
  }

  function activatePtrPair(n: number) {
    PointerPairTool.pointerCount = n
    setPtrCount(n)
    activate('pointer-pair')
  }

  function activateSlalom(n: number) {
    SlalomTool.coneCount = n
    setSlalomCount(n)
    activate('slalom')
  }

  function handlePtrCount(n: number) {
    PointerPairTool.pointerCount = n
    setPtrCount(n)
    if (activeTool === 'pointer-pair') activate('pointer-pair')
  }

  function handleSlalomCount(n: number) {
    SlalomTool.coneCount = n
    setSlalomCount(n)
    if (activeTool === 'slalom') activate('slalom')
  }

  function handleSizeChange(val: number) {
    coneSettings.size = val
    setConeSize(val)
    onSizeChange?.(val)
  }

  const at = activeTool

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
          label="Select" active={at === null}
          onClick={() => activate(null)}
        />
        <ToolBtn
          icon={<MiniAlign />}
          label="Align (L)" active={false}
          onClick={() => onAlign?.()}
        />
        <ToolBtn
          icon={<MiniCone type="standing" />}
          label="Standing" active={at === 'standing-cone'}
          onClick={() => activate('standing-cone')}
        />
        <ToolBtn
          icon={<MiniCone type="pointer" />}
          label="Pointer" active={at === 'pointer-cone'}
          onClick={() => activate('pointer-cone')}
        />
        <ToolBtn
          icon={<MiniCone type="timing_start" />}
          label="Tmg Start" active={at === 'timing-start'}
          onClick={() => activate('timing-start')}
        />
        <ToolBtn
          icon={<MiniCone type="timing_end" />}
          label="Tmg End" active={at === 'timing-end'}
          onClick={() => activate('timing-end')}
        />
        <ToolBtn
          icon={<MiniCone type="gcp" />}
          label="GCP" active={at === 'gcp'}
          onClick={() => activate('gcp')}
        />
        <ToolBtn
          icon={<MiniCone type="car_start" size={18} />}
          label="Car Start" active={at === 'car-start'}
          onClick={() => activate('car-start')}
        />

        <SectionLabel>Compound</SectionLabel>

        <ToolBtn
          icon={<MiniPair left="standing" right="standing" />}
          label="Gate" active={at === 'gate'}
          onClick={() => activate('gate')}
        />
        <ToolBtn
          icon={<MiniPair left="timing_start" right="timing_start" />}
          label="Start Gate" active={at === 'timing-start-gate'}
          onClick={() => activate('timing-start-gate')}
        />
        <ToolBtn
          icon={<MiniPair left="timing_end" right="timing_end" />}
          label="End Gate" active={at === 'timing-end-gate'}
          onClick={() => activate('timing-end-gate')}
        />
        <ToolBtn
          icon={<MiniChute />}
          label="Fin Chute" active={at === 'finish-chute'}
          onClick={() => activate('finish-chute')}
        />

        <SectionLabel>Ptr Pair</SectionLabel>
        <ToolBtn
          icon={<MiniPointerPair />}
          label="Ptr Pair" active={at === 'pointer-pair'}
          onClick={() => activatePtrPair(ptrCount)}
        />
        <CountInput value={ptrCount} min={1} max={6} onChange={handlePtrCount} />

        <SectionLabel>Slalom</SectionLabel>
        <ToolBtn
          icon={<MiniSlalom n={slalomCount} />}
          label="Slalom" active={at === 'slalom'}
          onClick={() => activateSlalom(slalomCount)}
        />
        <CountInput value={slalomCount} min={2} max={12} onChange={handleSlalomCount} />

        {/* ── cone size control ── */}
        <SectionLabel>Size</SectionLabel>
        <CountInput value={coneSize} min={1} max={8} onChange={handleSizeChange} />
      </div>
    </div>
  )
}
