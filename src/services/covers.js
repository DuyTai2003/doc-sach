import * as JSZip from 'jszip'

export async function extractEpubCover(buf) {
  try {
    const zip = await JSZip.loadAsync(buf)
    const p = new DOMParser()
    const cxml = await zip.file('META-INF/container.xml').async('string')
    const cdoc = p.parseFromString(cxml, 'application/xml')
    const opfPath = cdoc.querySelector('rootfile').getAttribute('full-path')
    const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : ''
    const opfXml = await zip.file(opfPath).async('string')
    const opfDoc = p.parseFromString(opfXml, 'application/xml')

    let coverHref = ''
    const metaCover = opfDoc.querySelector('meta[name="cover"]')
    if (metaCover) {
      const coverId = metaCover.getAttribute('content')
      const item = opfDoc.querySelector(`manifest item[id="${coverId}"]`)
      if (item) coverHref = item.getAttribute('href')
    }
    if (!coverHref) {
      const coverItem = Array.from(opfDoc.querySelectorAll('manifest item')).find(i => /cover\.(jpg|jpeg|png)$/i.test(i.getAttribute('href')))
      if (coverItem) coverHref = coverItem.getAttribute('href')
    }
    if (coverHref) {
      let cFile = zip.file(opfDir + coverHref) || zip.file(decodeURIComponent(opfDir + coverHref))
      if (!cFile) cFile = zip.file(coverHref)
      if (cFile) {
        const b64 = await cFile.async('base64')
        const ext = coverHref.split('.').pop().toLowerCase()
        const mime = ext==='png'?'image/png':'image/jpeg'
        return `data:${mime};base64,${b64}`
      }
    }
  } catch(e) { console.error("Cover extract error:", e) }
  return null
}

export async function extractPdfCover(buf, pdfjsLib) {
  try {
    const pdf = await pdfjsLib.getDocument({ data: buf.slice(0) }).promise
    const page = await pdf.getPage(1)
    const viewport = page.getViewport({ scale: 0.5 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width; canvas.height = viewport.height
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
    return canvas.toDataURL('image/jpeg', 0.8)
  } catch(e) { console.error("Cover extract error:", e) }
  return null
}

export async function extractZipCover(buf) {
  try {
    const zip = await JSZip.loadAsync(buf)
    const imgFiles = Object.values(zip.files)
      .filter(f => !f.dir && /\.(png|jpe?g|webp)$/i.test(f.name))
      .sort((a,b) => a.name.localeCompare(b.name, undefined, {numeric:true}))
    if (imgFiles.length > 0) {
      const b64 = await imgFiles[0].async('base64')
      const ext = imgFiles[0].name.split('.').pop().toLowerCase()
      const mime = ext==='png'?'image/png':ext==='webp'?'image/webp':'image/jpeg'
      return `data:${mime};base64,${b64}`
    }
  } catch(e) { console.error("Cover extract error:", e) }
  return null
}
