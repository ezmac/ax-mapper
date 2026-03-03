import { Box } from 'tldraw'
import type { Editor } from 'tldraw'
import type { ConeShape } from '../types/cone'

const PIXEL_RATIO = 3

export async function exportPng(
  editor: Editor,
  imageUrl: string | null,
  siteW: number,  // feet
  siteH: number,  // feet
  scale: number,  // metres per canvas unit
) {
  const canvasW = siteW * 0.3048 / scale
  const canvasH = siteH * 0.3048 / scale
  const pxW = Math.round(canvasW * PIXEL_RATIO)
  const pxH = Math.round(canvasH * PIXEL_RATIO)

  const canvas = document.createElement('canvas')
  canvas.width = pxW
  canvas.height = pxH
  const ctx = canvas.getContext('2d')!

  // Draw background
  if (imageUrl) {
    await new Promise<void>((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, pxW, pxH)
        resolve()
      }
      img.onerror = reject
      img.src = imageUrl
    })
  } else {
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, pxW, pxH)
  }

  // Export cones and composite on top
  const shapeIds = editor.getCurrentPageShapes()
    .filter(s => !(s as ConeShape).props?.isGhost)
    .map(s => s.id)

  if (shapeIds.length > 0) {
    const { blob } = await editor.toImage(shapeIds, {
      format: 'png',
      bounds: new Box(0, 0, canvasW, canvasH),
      padding: 0,
      pixelRatio: PIXEL_RATIO,
      background: false,
    })
    const bitmap = await createImageBitmap(blob)
    ctx.drawImage(bitmap, 0, 0)
    bitmap.close()
  }

  const finalBlob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png')
  )

  const url = URL.createObjectURL(finalBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'ax_course.png'
  a.click()
  URL.revokeObjectURL(url)
}
