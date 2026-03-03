import { useState } from 'react'
import { useEditor } from 'tldraw'
import { SlalomTool } from '../tools/SlalomTool'
import { PointerPairTool } from '../tools/PointerPairTool'
import { coneSettings } from '../settings'
import { renderCone } from '../shapes/ConeShapeUtil'
import type { ConeShape } from '../types/cone'

// ─── mini SVG icon helpers ────────────────────────────────────────────────────

type ConeT = ConeShape['props']['coneType']

function MiniCone({ type, size = 14 }: { type: ConeT; size?: number }) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {renderCone(type, size, size)}
    </svg>
  )
}

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

/** Standing cone + one pointer (tip pointing left) as a compact icon. */
function MiniPointerPair({ size = 10 }: { size?: number }) {
  const pw = Math.round(size * 1.5)
  const gap = 2
  const total = size + gap + pw
  return (
    <svg width={total} height={size} viewBox={`0 0 ${total} ${size}`}>
      {renderCone('standing', size, size)}
      {/* flip horizontally so tip faces the standing cone */}
      <g transform={`translate(${size + gap + pw}, 0) scale(-1, 1)`}>
        {renderCone('pointer', pw, size)}
      </g>
    </svg>
  )
}

/** Vertical column of N cones for the slalom icon (capped at 5 for display). */
function MiniSlalom({ n = 4, size = 5 }: { n?: number; size?: number }) {
  const display = Math.min(n, 5)
  const gap = 2
  const h = display * size + (display - 1) * gap
  return (
    <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`}>
      {Array.from({ length: display }, (_, i) => (
        <g key={i} transform={`translate(0, ${i * (size + gap)})`}>
          {renderCone('standing', size, size)}
        </g>
      ))}
    </svg>
  )
}

/** Two parallel columns of cones for the finish chute icon. */
function MiniChute({ rows = 4, size = 5 }: { rows?: number; size?: number }) {
  const gap = 5
  const rowSpacing = size + 2
  const w = size * 2 + gap
  const h = rows * rowSpacing - 2
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {Array.from({ length: rows }, (_, i) => (
        <g key={i} transform={`translate(0, ${i * rowSpacing})`}>
          {renderCone('standing', size, size)}
          <g transform={`translate(${size + gap}, 0)`}>
            {renderCone('standing', size, size)}
          </g>
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

/** Compact -/+ count input that fits inside the 72px sidebar. */
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

export function ConeToolbar() {
  const editor = useEditor()
  const [activeTool, setActiveTool] = useState('select')
  const [slalomCount, setSlalomCount] = useState(SlalomTool.coneCount)
  const [ptrCount, setPtrCount] = useState(PointerPairTool.pointerCount)
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

  function handlePtrCount(n: number) {
    PointerPairTool.pointerCount = n
    setPtrCount(n)
    if (activeTool === 'pointer-pair') editor.setCurrentTool('pointer-pair')
    focusCanvas()
  }

  function handleSlalomCount(n: number) {
    SlalomTool.coneCount = n
    setSlalomCount(n)
    if (activeTool === 'slalom') editor.setCurrentTool('slalom')
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
          icon={<MiniPair left="timing_start" right="timing_start" />}
          label="Start Gate" active={activeTool === 'timing-start-gate'}
          onClick={() => activate('timing-start-gate')}
        />
        <ToolBtn
          icon={<MiniPair left="timing_end" right="timing_end" />}
          label="End Gate" active={activeTool === 'timing-end-gate'}
          onClick={() => activate('timing-end-gate')}
        />
        <ToolBtn
          icon={<MiniChute />}
          label="Fin Chute" active={activeTool === 'finish-chute'}
          onClick={() => activate('finish-chute')}
        />

        <SectionLabel>Ptr Pair</SectionLabel>
        <ToolBtn
          icon={<MiniPointerPair />}
          label="Ptr Pair" active={activeTool === 'pointer-pair'}
          onClick={() => activatePtrPair(ptrCount)}
        />
        <CountInput value={ptrCount} min={1} max={6} onChange={handlePtrCount} />

        <SectionLabel>Slalom</SectionLabel>
        <ToolBtn
          icon={<MiniSlalom n={slalomCount} />}
          label="Slalom" active={activeTool === 'slalom'}
          onClick={() => activateSlalom(slalomCount)}
        />
        <CountInput value={slalomCount} min={2} max={12} onChange={handleSlalomCount} />

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
