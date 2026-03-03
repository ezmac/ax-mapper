import type Konva from 'konva'

const PIXEL_RATIO = 3

export async function exportPng(
  stage: Konva.Stage,
  imageUrl: string | null,
  siteW: number,  // feet
  siteH: number,  // feet
  scale: number,  // metres per canvas unit
) {
  const canvasW = siteW * 0.3048 / scale
  const canvasH = siteH * 0.3048 / scale
  const pxW = Math.round(canvasW * PIXEL_RATIO)
  const pxH = Math.round(canvasH * PIXEL_RATIO)

  // Use an offscreen canvas to composite background + cones
  const canvas = document.createElement('canvas')
  canvas.width = pxW
  canvas.height = pxH
  const ctx = canvas.getContext('2d')!

  // Draw background
  if (imageUrl) {
    await new Promise<void>((resolve, reject) => {
      const img = new Image()
      img.onload = () => { ctx.drawImage(img, 0, 0, pxW, pxH); resolve() }
      img.onerror = reject
      img.src = imageUrl
    })
  } else {
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, pxW, pxH)
  }

  // Export cones from the Konva stage at 1:1 scale (no pan/zoom)
  // We temporarily set the stage to identity transform over the canvas bounds,
  // but the simplest approach: use stage.toDataURL with a clip to the site bounds.
  // The ghost layer is the 3rd layer (index 2); hide it during export.
  const layers = stage.getLayers()
  const ghostLayer = layers[2]   // ghostLayer added third in KonvaCanvas
  const savedVisible = ghostLayer?.visible() ?? true
  ghostLayer?.visible(false)

  const savedPos = { x: stage.x(), y: stage.y() }
  const savedScale = { x: stage.scaleX(), y: stage.scaleY() }

  // Temporarily set stage to render the canvas bounds at PIXEL_RATIO
  stage.position({ x: 0, y: 0 })
  stage.scale({ x: PIXEL_RATIO, y: PIXEL_RATIO })
  stage.width(pxW)
  stage.height(pxH)

  const dataUrl = stage.toDataURL({
    pixelRatio: 1,    // we've already scaled manually
    x: 0,
    y: 0,
    width: pxW,
    height: pxH,
  })

  // Restore stage
  stage.position(savedPos)
  stage.scale(savedScale)
  stage.width(stage.container().offsetWidth)
  stage.height(stage.container().offsetHeight)
  ghostLayer?.visible(savedVisible)
  stage.batchDraw()

  // Draw cones on top of background
  await new Promise<void>((resolve, reject) => {
    const img = new Image()
    img.onload = () => { ctx.drawImage(img, 0, 0); resolve() }
    img.onerror = reject
    img.src = dataUrl
  })

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
