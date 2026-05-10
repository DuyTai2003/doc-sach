import * as JSZip from 'jszip'
import * as pdfjsLib from 'pdfjs-dist'

export async function detectEpubGenres(buf) {
  try {
    const zip = await JSZip.loadAsync(buf)
    const p = new DOMParser()
    const cxml = await zip.file('META-INF/container.xml').async('string')
    const cdoc = p.parseFromString(cxml, 'application/xml')
    const opfPath = cdoc.querySelector('rootfile').getAttribute('full-path')
    const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : ''
    const opfXml = await zip.file(opfPath).async('string')
    const opfDoc = p.parseFromString(opfXml, 'application/xml')

    const genres = []
    opfDoc.querySelectorAll('dc\\:subject, subject').forEach(el => {
      const v = el.textContent?.trim()
      if (v && v.length < 50 && !/^\d+$/.test(v)) genres.push(v)
    })
    opfDoc.querySelectorAll('meta[name="genre"], meta[property="genre"], meta[name="calibre:genre"]').forEach(el => {
      const v = el.getAttribute('content')?.trim()
      if (v && v.length < 50 && !genres.includes(v)) genres.push(v)
    })
    return [...new Set(genres)]
  } catch(e) { return [] }
}

export async function parseEpub(buf, t) {
  const zip = await JSZip.loadAsync(buf)
  const p   = new DOMParser()
  const cxml = await zip.file('META-INF/container.xml').async('string')
  const cdoc = p.parseFromString(cxml, 'application/xml')
  const opfPath = cdoc.querySelector('rootfile').getAttribute('full-path')
  const opfDir  = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : ''
  const opfXml  = await zip.file(opfPath).async('string')
  const opfDoc  = p.parseFromString(opfXml, 'application/xml')
  const mf = {}
  opfDoc.querySelectorAll('manifest item').forEach(it => {
    mf[it.getAttribute('id')] = { href: it.getAttribute('href'), type: it.getAttribute('media-type') }
  })
  const spine = Array.from(opfDoc.querySelectorAll('spine itemref')).map(r => r.getAttribute('idref'))
  let ncx = {}
  const ncxId = opfDoc.querySelector('spine')?.getAttribute('toc')
  if (ncxId && mf[ncxId]) {
    try {
      const nx = await zip.file(opfDir + mf[ncxId].href)?.async('string')
      const nd = p.parseFromString(nx, 'application/xml')
      nd.querySelectorAll('navPoint').forEach(np => {
        const src = np.querySelector('content')?.getAttribute('src')?.split('#')[0]
        const ti   = np.querySelector('navLabel text')?.textContent?.trim()
        if (src && ti) ncx[src] = ti
      })
    } catch(e) {}
  }
  const chs = []
  for (const id of spine) {
    const item = mf[id]
    if (!item || !item.href.match(/\.x?html?$/i)) continue
    try {
      const html  = await zip.file(opfDir + item.href)?.async('string')
      if (!html) continue
      const chDoc = p.parseFromString(html, 'text/html')
      for (const img of chDoc.querySelectorAll('img')) {
        const src = img.getAttribute('src'); if (!src) continue
        try {
          const candidates = [opfDir+src, opfDir+src.replace(/^\.\.\//,''), src.replace(/^\.\.\//,''), src]
          let ifile = null
          for (const c of candidates) { ifile = zip.file(decodeURIComponent(c)); if (ifile) break }
          if (ifile) {
            const b64  = await ifile.async('base64')
            const ext2 = src.split('.').pop().toLowerCase()
            const mime = ext2==='png'?'image/png':ext2==='gif'?'image/gif':ext2==='svg'?'image/svg+xml':'image/jpeg'
            img.src = `data:${mime};base64,${b64}`
          }
        } catch(e) {}
      }
      chDoc.querySelectorAll('style,link[rel=stylesheet]').forEach(el => el.remove())
      const title = ncx[item.href] || chDoc.querySelector('h1,h2,h3')?.textContent?.trim() || `${t.chapterTitle} ${chs.length+1}`
      chs.push({ title, type: 'html', content: chDoc.body?.innerHTML || html })
    } catch(e) {}
  }
  return chs
}

export async function parsePdf(buf, t) {
  const pdf = await pdfjsLib.getDocument({ data: buf.slice(0) }).promise
  const chs = []
  for (let i = 0; i < pdf.numPages; i += 5) {
    const fr = i + 1, to = Math.min(i + 5, pdf.numPages)
    chs.push({ title: `${t.pageTitle} ${fr}–${to}`, type: 'pdf', from: fr, to, pdf })
  }
  return chs
}

export async function parseZip(buf, bookName) {
  const zip = await JSZip.loadAsync(buf)
  const imgFiles = Object.values(zip.files)
    .filter(f => !f.dir && /\.(png|jpe?g|webp|gif)$/i.test(f.name))
    .sort((a,b) => a.name.localeCompare(b.name, undefined, {numeric:true}))

  const urls = []
  for(let i = 0; i < imgFiles.length; i++) {
    const blob = await imgFiles[i].async('blob')
    urls.push(URL.createObjectURL(blob))
  }
  return [{ title: bookName || 'Manga', type: 'manga', urls }]
}

export async function parseTxt(buf, t) {
  const text = new TextDecoder('utf-8').decode(buf);
  const lines = text.split(/\r?\n/);
  const chs = [];
  let currentTitle = `${t.chapterTitle} 1`;
  let currentHtml = "";
  const chapRegex = /^(chương|chapter|đệ|hồi|phần)\s+[\d\w]+/i;

  for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        currentHtml += "<br/>";
        continue;
      }
      if (line.length < 100 && chapRegex.test(line)) {
          if (currentHtml.trim()) {
              chs.push({ title: currentTitle, type: 'html', content: `<div style="text-align:justify;">${currentHtml}</div>` });
              currentHtml = "";
          }
          currentTitle = line;
      } else {
          currentHtml += `<p style="margin-bottom:0.5em;text-indent:0.6em;text-align:justify;">${line}</p>`;
      }
  }
  if (currentHtml.trim()) {
      chs.push({ title: currentTitle, type: 'html', content: `<div style="text-align:justify;">${currentHtml}</div>` });
  }
  if (chs.length === 1 && chs[0].content && chs[0].content.length > 50000) {
     const chunks = []; for(let i=0; i<lines.length; i+=500) chunks.push(lines.slice(i, i+500).join('\n'));
     return chunks.map((chunk, idx) => ({ title: `${t.chapterTitle} ${idx+1}`, type: 'html', content: `<div style="text-align:justify;">${chunk.split('\n').map(l => l?'<p style="margin-bottom:0.5em;text-indent:0.6em;text-align:justify;">'+l+'</p>':'<br/>').join('')}</div>` }));
  }
  return chs;
}
