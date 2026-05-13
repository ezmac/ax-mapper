import { useState } from 'react'
import QRCode from 'qrcode'
import type { ConeData } from '../canvas/ConeData'
import { buildLayoutPayload } from '../utils/layoutExport'
import { compressToBase64url } from '../utils/layoutUrl'

const SECTION_COLORS = ['', '#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ec4899']

interface Props {
  cones: ConeData[]
  projectName: string
  onClose: () => void
}

export function LayoutExportModal({ cones, projectName, onClose }: Props) {
  const [selectedSection, setSelectedSection] = useState<number | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  const placed = cones.filter(c => !c.isGhost && !c.noExport)
  const gcpsWithCoords = placed.filter(c => c.coneType === 'gcp' && c.gcpCoords)
  const gcpOk = gcpsWithCoords.length >= 3

  const sectionCounts = ([1, 2, 3, 4, 5] as const).map(s => ({
    section: s,
    count: placed.filter(c => c.section === s && c.coneType !== 'gcp' && c.coneType !== 'car_start').length,
  }))

  async function generate() {
    if (!selectedSection) return
    setGenerating(true)
    setError(null)
    setQrDataUrl(null)
    setShareUrl(null)
    try {
      const payload = buildLayoutPayload(cones, selectedSection, projectName)
      const json = JSON.stringify(payload)
      const compressed = await compressToBase64url(json)
      const url = `${window.location.origin}${window.location.pathname}?d=${compressed}`
      setShareUrl(url)
      const dataUrl = await QRCode.toDataURL(url, {
        width: 240, margin: 1,
        color: { dark: '#0f172a', light: '#f1f5f9' },
      })
      setQrDataUrl(dataUrl)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setGenerating(false)
    }
  }

  function copyUrl() {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(0,0,0,0.6)', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  }

  const modalStyle: React.CSSProperties = {
    background: '#1e293b', border: '1px solid #475569',
    borderRadius: 12, padding: 24, minWidth: 320, maxWidth: 400,
    color: '#e2e8f0', display: 'flex', flexDirection: 'column', gap: 16,
  }

  const btnStyle: React.CSSProperties = {
    background: '#334155', color: '#cbd5e1',
    border: '1px solid #475569', borderRadius: 6,
    padding: '6px 14px', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', whiteSpace: 'nowrap',
  }

  return (
    <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Layout Export</span>
          <button onClick={onClose} style={{ ...btnStyle, padding: '2px 8px' }}>✕</button>
        </div>

        {!gcpOk && (
          <div style={{
            background: 'rgba(234,179,8,0.12)', border: '1px solid #ca8a04',
            borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#fde047',
          }}>
            ⚠ {gcpsWithCoords.length}/3 GCPs have GPS coordinates. Select each GCP cone and enter lat/lon before exporting.
          </div>
        )}

        <div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Select section to export:</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {sectionCounts.map(({ section, count }) => (
              <button
                key={section}
                onClick={() => { setSelectedSection(section); setQrDataUrl(null); setShareUrl(null); setError(null) }}
                disabled={count === 0}
                style={{
                  width: 64, padding: '6px 4px', borderRadius: 6, border: '2px solid',
                  borderColor: selectedSection === section ? SECTION_COLORS[section] : '#475569',
                  background: selectedSection === section ? SECTION_COLORS[section] + '22' : 'transparent',
                  color: count === 0 ? '#475569' : selectedSection === section ? SECTION_COLORS[section] : '#cbd5e1',
                  fontSize: 12, fontWeight: 700, cursor: count === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                }}
              >
                <span style={{ fontSize: 15 }}>{section}</span>
                <span style={{ fontSize: 10, fontWeight: 400 }}>{count} cones</span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={generate}
          disabled={!selectedSection || !gcpOk || generating}
          style={{
            ...btnStyle,
            background: selectedSection && gcpOk && !generating ? '#2563eb' : '#334155',
            color: selectedSection && gcpOk && !generating ? 'white' : '#64748b',
            cursor: selectedSection && gcpOk && !generating ? 'pointer' : 'not-allowed',
          }}
        >
          {generating ? 'Generating…' : 'Generate QR + Link'}
        </button>

        {error && (
          <div style={{ fontSize: 12, color: '#f87171', background: 'rgba(239,68,68,0.1)', borderRadius: 6, padding: '8px 12px' }}>
            {error}
          </div>
        )}

        {qrDataUrl && shareUrl && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <img src={qrDataUrl} alt="QR code" style={{ borderRadius: 8, width: 240, height: 240 }} />
            <button onClick={copyUrl} style={{ ...btnStyle, alignSelf: 'stretch', textAlign: 'center' }}>
              {copied ? '✓ Copied!' : '📋 Copy URL'}
            </button>
            <div style={{ fontSize: 10, color: '#475569', wordBreak: 'break-all', textAlign: 'center' }}>
              {shareUrl.length} chars
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
