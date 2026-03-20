import { useEffect, useRef, useState } from 'react'
import type { ProjectData } from '../services/ProjectStore'

interface Props {
  activeProjectId: string | null
  projects: ProjectData[]
  onLoad: (id: string) => void
  onNew: (name: string, keepImage: boolean) => void
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
}

const btnBase: React.CSSProperties = {
  background: '#334155',
  color: '#cbd5e1',
  border: '1px solid #475569',
  borderRadius: 6,
  padding: '4px 10px',
  fontSize: 12,
  cursor: 'pointer',
  fontWeight: 600,
  whiteSpace: 'nowrap',
}

export function ProjectMenu({ activeProjectId, projects, onLoad, onNew, onDelete, onRename }: Props) {
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [creatingNew, setCreatingNew] = useState<'blank' | 'background' | null>(null)
  const [newName, setNewName] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false)
        setCreatingNew(null)
        setEditingId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const activeProject = projects.find(p => p.id === activeProjectId)

  function commitNew() {
    const name = newName.trim() || 'Untitled Project'
    onNew(name, creatingNew === 'background')
    setCreatingNew(null)
    setNewName('')
    setOpen(false)
  }

  function commitRename() {
    if (!editingId) return
    const name = editName.trim()
    if (name) onRename(editingId, name)
    setEditingId(null)
  }

  function startEdit(p: ProjectData, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingId(p.id)
    setEditName(p.name)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => { setOpen(o => !o); setCreatingNew(null); setEditingId(null) }}
        style={{
          ...btnBase,
          background: open ? '#475569' : '#334155',
          borderColor: open ? '#64748b' : '#475569',
          fontSize: 13,
          padding: '4px 10px',
        }}
      >
        📂 {activeProject?.name ?? 'Project'} ▾
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          zIndex: 200,
          background: '#1e293b',
          border: '1px solid #475569',
          borderRadius: 8,
          padding: '8px 0',
          minWidth: 300,
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        }}>

          {projects.length === 0 && (
            <div style={{ color: '#64748b', fontSize: 12, padding: '6px 14px' }}>No saved projects</div>
          )}

          {projects.map(p => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 10px',
              background: p.id === activeProjectId ? '#1e3a5f' : 'transparent',
            }}>
              {editingId === p.id ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitRename()
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  style={{
                    flex: 1, background: '#0f172a', color: 'white',
                    border: '1px solid #2563eb', borderRadius: 4,
                    padding: '3px 6px', fontSize: 13,
                  }}
                />
              ) : (
                <span
                  onDoubleClick={e => startEdit(p, e)}
                  title="Double-click to rename"
                  style={{
                    flex: 1,
                    color: p.id === activeProjectId ? '#93c5fd' : '#e2e8f0',
                    fontSize: 13, cursor: 'default',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    userSelect: 'none',
                  }}
                >
                  {p.id === activeProjectId ? '● ' : '\u00a0\u00a0'}{p.name}
                </span>
              )}

              {p.id !== activeProjectId && (
                <button
                  onClick={() => { onLoad(p.id); setOpen(false) }}
                  style={{ ...btnBase, padding: '2px 8px', fontSize: 11 }}
                >
                  Load
                </button>
              )}

              <button
                onClick={() => {
                  if (confirm(`Delete "${p.name}"?`)) onDelete(p.id)
                }}
                style={{ ...btnBase, padding: '2px 8px', fontSize: 11, color: '#f87171', borderColor: '#7f1d1d' }}
              >
                ✕
              </button>
            </div>
          ))}

          <div style={{ borderTop: '1px solid #334155', margin: '6px 0' }} />

          {creatingNew ? (
            <div style={{ padding: '6px 10px', display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                autoFocus
                placeholder={creatingNew === 'blank' ? 'New project name…' : 'New project name (keeps background)…'}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitNew()
                  if (e.key === 'Escape') setCreatingNew(null)
                }}
                style={{
                  flex: 1, background: '#0f172a', color: 'white',
                  border: '1px solid #2563eb', borderRadius: 4,
                  padding: '4px 8px', fontSize: 13,
                }}
              />
              <button
                onClick={commitNew}
                style={{ ...btnBase, background: '#2563eb', color: 'white', borderColor: '#2563eb' }}
              >
                Create
              </button>
              <button onClick={() => setCreatingNew(null)} style={btnBase}>✕</button>
            </div>
          ) : (
            <div style={{ padding: '4px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button
                onClick={() => { setCreatingNew('blank'); setNewName('') }}
                style={{ ...btnBase, textAlign: 'left' }}
              >
                + New blank project
              </button>
              <button
                onClick={() => { setCreatingNew('background'); setNewName('') }}
                style={{ ...btnBase, textAlign: 'left' }}
              >
                + New from current background
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
