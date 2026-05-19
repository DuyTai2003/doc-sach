import { useState, useEffect, useRef, useCallback } from 'react'
import * as JSZip from 'jszip'
import * as pdfjsLib from 'pdfjs-dist'
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { KeepAwake } from '@capacitor-community/keep-awake';
import { THEMES, FONTS, APP_THEMES, DROP_STYLE, TAG_COLORS, randomTagColor } from './themes.js'
import TRANSLATIONS from './translations.js'
import { openDB, dbGet, dbGetAll, dbPut, dbDelete, dbUpdateBook, removeCategoryFromAllBooks, exportData, importData } from './db.js'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

async function extractEpubCover(buf) {
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

async function extractPdfCover(buf) {
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

async function extractZipCover(buf) {
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

const Btn = ({ children, onClick, disabled, style }) => (
  <button onClick={onClick} disabled={disabled} style={{ ...style, opacity: disabled ? .25 : 1 }}>{children}</button>
)

const Dropdown = ({ value, onChange, options, ac, btnStyle }) => {
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.value === value)
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div
        onClick={() => setOpen(!open)}
        style={{...btnStyle, width: '100%', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none', textAlign: 'left' }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected?.label || value}</span>
        <span style={{ fontSize: 10, opacity: 0.5, flexShrink: 0 }}>▼</span>
      </div>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 1 }} onClick={() => setOpen(false)} />
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 2, ...DROP_STYLE.container, maxHeight: 200, overflowY: 'auto', marginTop: 4 }}>
            {options.map(o => (
              <div
                key={o.value}
                onClick={() => { onChange(o.value); setOpen(false); }}
                style={{ ...DROP_STYLE.item, ...(value === o.value ? DROP_STYLE.itemSelected : DROP_STYLE.itemNormal) }}
              >
                {o.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function App() {
  const [books, setBooks]             = useState([])
  const [currentBook, setCurrentBook] = useState(null)
  const [chapters, setChapters]       = useState([])
  const [curChap, setCurChap]         = useState(0)
  const [loading, setLoading]         = useState(false)
  const [loadMsg, setLoadMsg]         = useState('')
  const [theme, setTheme]             = useState('sepia')
  const [font, setFont]               = useState('Arial,sans-serif')
  const [fontSize, setFontSize]       = useState(18)
  const [lineH, setLineH]             = useState(1.85)
  const [lang, setLang] = useState('vi')
  const [appTheme, setAppTheme] = useState('warmCream')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [tapConfig, setTapConfig] = useState(2)
  const [readMode, setReadMode] = useState('vertical')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const t = TRANSLATIONS[lang]
  const [showSidebar, setShowSidebar] = useState(true)
  const [showChapterGrid, setShowChapterGrid] = useState(false)
  const [showThemeDropdown, setShowThemeDropdown] = useState(false)
  const [showReadThemeDropdown, setShowReadThemeDropdown] = useState(false)
  const [chapInput, setChapInput]     = useState('')
  const [view, setView]               = useState('welcome')
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [progressMap, setProgressMap] = useState({})
  const [touchStartX, setTouchStartX] = useState(null)
  const [touchStartY, setTouchStartY] = useState(null)

  // --- NEW STATE: Tags & Categories ---
  const [categories, setCategories] = useState([])
  const [selectedCategoryId, setSelectedCategoryId] = useState('all')
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [selectedBookIds, setSelectedBookIds] = useState(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [showTagModal, setShowTagModal] = useState(false)
  const [editingTag, setEditingTag] = useState(null)
  const [showBulkTagModal, setShowBulkTagModal] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [tagContextMenu, setTagContextMenu] = useState(null) // { tagId, x, y }

  const scrollRef = useRef(null)
  const pageRef   = useRef(null)
  const chapterListRef = useRef(null)
  const clickTimeoutRef = useRef(null)
  const longPressRef = useRef(null)

  const isFullscreenRef = useRef(isFullscreen)
  const viewRef = useRef(view)
  const isMenuOpenRef = useRef(isMenuOpen)

  useEffect(() => { isFullscreenRef.current = isFullscreen }, [isFullscreen])
  useEffect(() => { viewRef.current = view }, [view])
  useEffect(() => { isMenuOpenRef.current = isMenuOpen }, [isMenuOpen])

  useEffect(() => {
    let listener = null;
    const setupBackButton = async () => {
      try {
        const { App: CapApp } = await import('@capacitor/app');
        listener = await CapApp.addListener('backButton', async () => {
          if (isMenuOpenRef.current) {
            setIsMenuOpen(false)
          } else if (isFullscreenRef.current) {
            setIsFullscreen(false)
            try {
              const { StatusBar } = await import('@capacitor/status-bar');
              await StatusBar.show();
            } catch (e) {}
          } else if (viewRef.current === 'reader') {
            setView('library')
          } else {
            CapApp.exitApp()
          }
        });
      } catch (e) {}
    };
    setupBackButton();
    return () => {
      if (listener) listener.remove();
    }
  }, []);

  useEffect(() => {
    ;(async () => {
      const s = await dbGet('settings', 'ui')
      if (s) {
        setTheme(s.theme || 'sepia')
        setFont(s.font || 'Arial,sans-serif')
        setFontSize(s.fontSize || 18)
        setLineH(s.lineH || 1.85)
        if (s.lang) setLang(s.lang)
        if (s.tapConfig) setTapConfig(s.tapConfig)
        if (s.appTheme) setAppTheme(s.appTheme)
        if (s.readMode) setReadMode(s.readMode)
      }
      setSettingsLoaded(true)
      const bks = await dbGetAll('books')
      setBooks(bks)
      const progs = await dbGetAll('progress')
      const pMap = {}
      progs.forEach(p => { pMap[p.bookId] = p })
      setProgressMap(pMap)
      const cats = await dbGetAll('categories')
      setCategories(cats)
      if (bks.length > 0) setView('library')
    })()
  }, [])

  useEffect(() => {
    if (!settingsLoaded) return
    dbPut('settings', { key: 'ui', theme, font, fontSize, lineH, lang, tapConfig, appTheme, readMode })
  }, [theme, font, fontSize, lineH, lang, tapConfig, appTheme, readMode, settingsLoaded])

  useEffect(() => {
    if (showChapterGrid && chapterListRef.current) {
      const activeEl = chapterListRef.current.children[curChap];
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
  }, [showChapterGrid, curChap]);

  // --- TAG OPERATIONS ---
  async function createTag(name, color) {
    const tag = { name, color: color || randomTagColor(), pinned: false, createdAt: Date.now() }
    const id = await dbPut('categories', tag)
    const cats = await dbGetAll('categories')
    setCategories(cats)
    return id
  }

  async function updateTag(id, fields) {
    const cat = categories.find(c => c.id === id)
    if (!cat) return
    await dbPut('categories', { ...cat, ...fields })
    const cats = await dbGetAll('categories')
    setCategories(cats)
  }

  async function deleteTag(id) {
    if (!confirm(t.confirmDeleteTag)) return
    await dbDelete('categories', id)
    await removeCategoryFromAllBooks(id)
    const bks = await dbGetAll('books')
    setBooks(bks)
    const cats = await dbGetAll('categories')
    setCategories(cats)
    setTagContextMenu(null)
  }

  async function togglePinTag(id) {
    const cat = categories.find(c => c.id === id)
    if (!cat) return
    await updateTag(id, { pinned: !cat.pinned })
  }

  async function assignTagToBook(bookId, catId) {
    const book = books.find(b => b.id === bookId)
    if (!book) return
    const categoryIds = [...(book.categoryIds || [])]
    if (categoryIds.includes(catId)) {
      // Remove tag
      await dbUpdateBook(bookId, { categoryIds: categoryIds.filter(id => id !== catId) })
    } else {
      // Add tag
      await dbUpdateBook(bookId, { categoryIds: [...categoryIds, catId] })
    }
    const bks = await dbGetAll('books')
    setBooks(bks)
  }

  async function assignTagToBooks(bookIds, catId) {
    for (const id of bookIds) {
      const book = books.find(b => b.id === id)
      if (!book) continue
      const categoryIds = [...(book.categoryIds || [])]
      if (!categoryIds.includes(catId)) {
        await dbUpdateBook(id, { categoryIds: [...categoryIds, catId] })
      }
    }
    const bks = await dbGetAll('books')
    setBooks(bks)
  }

  async function toggleFavorite(bookId) {
    const book = books.find(b => b.id === bookId)
    if (!book) return
    await dbUpdateBook(bookId, { favorite: !book.favorite })
    const bks = await dbGetAll('books')
    setBooks(bks)
  }

  async function bulkToggleFavorite() {
    const allFav = Array.from(selectedBookIds).every(id => books.find(b => b.id === id)?.favorite)
    for (const id of selectedBookIds) {
      await dbUpdateBook(id, { favorite: !allFav })
    }
    const bks = await dbGetAll('books')
    setBooks(bks)
  }

  async function bulkDelete() {
    if (!confirm(t.confirmDeleteBooks)) return
    for (const id of selectedBookIds) {
      await dbDelete('books', id)
      await dbDelete('progress', id)
    }
    setIsSelectMode(false)
    setSelectedBookIds(new Set())
    const bks = await dbGetAll('books')
    setBooks(bks)
    if (currentBook && selectedBookIds.has(currentBook.id)) {
      setCurrentBook(null)
      setView('library')
    }
  }

  function toggleSelectBook(id) {
    setSelectedBookIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function exitSelectMode() {
    setIsSelectMode(false)
    setSelectedBookIds(new Set())
  }

  // --- FILTERED BOOKS ---
  const filteredBooks = (() => {
    let result = [...books]

    // Filter by category
    if (selectedCategoryId === 'favorites') {
      result = result.filter(b => b.favorite)
    } else if (selectedCategoryId === 'uncategorized') {
      result = result.filter(b => !b.categoryIds || b.categoryIds.length === 0)
    } else if (selectedCategoryId !== 'all') {
      result = result.filter(b => b.categoryIds && b.categoryIds.includes(selectedCategoryId))
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(b => b.name.toLowerCase().includes(q))
    }

    return result
  })()

  // Category counts
  function getCatCount(catId) {
    return books.filter(b => b.categoryIds && b.categoryIds.includes(catId)).length
  }
  const favCount = books.filter(b => b.favorite).length
  const uncatCount = books.filter(b => !b.categoryIds || b.categoryIds.length === 0).length

  // Sort categories: pinned first, then A-Z
  const sortedCategories = [...categories].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return a.name.localeCompare(b.name)
  })

  // --- HANDLE FILE ---
  // --- AUTO-DETECT EPUB GENRE ---
  async function detectEpubGenres(buf) {
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
      // Dublin Core subjects
      opfDoc.querySelectorAll('dc\\:subject, subject').forEach(el => {
        const v = el.textContent?.trim()
        if (v && v.length < 50 && !/^\d+$/.test(v)) genres.push(v)
      })
      // Custom meta genre/type tags (Calibre, Sigil...)
      opfDoc.querySelectorAll('meta[name="genre"], meta[property="genre"], meta[name="calibre:genre"]').forEach(el => {
        const v = el.getAttribute('content')?.trim()
        if (v && v.length < 50 && !genres.includes(v)) genres.push(v)
      })
      return [...new Set(genres)] // dedupe
    } catch(e) { return [] }
  }

  async function findOrCreateTags(genreNames) {
    const currentCats = await dbGetAll('categories')
    const tagIds = []
    for (const name of genreNames) {
      const cleanName = name.replace(/[,;]/g, '').trim()
      if (!cleanName || cleanName.length > 40) continue
      // Case-insensitive match
      let cat = currentCats.find(c => c.name.toLowerCase() === cleanName.toLowerCase())
      if (!cat) {
        const id = await dbPut('categories', { name: cleanName, color: randomTagColor(), pinned: false, createdAt: Date.now() })
        cat = { id, name: cleanName, color: randomTagColor(), pinned: false }
      }
      if (!tagIds.includes(cat.id)) tagIds.push(cat.id)
    }
    const cats = await dbGetAll('categories')
    setCategories(cats)
    return tagIds
  }

  async function handleFile(file) {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    setLoading(true); setLoadMsg(TRANSLATIONS[lang].reading)
    try {
      const buf = await file.arrayBuffer()
      let cover = null;
      if (ext === 'epub') cover = await extractEpubCover(buf);
      else if (ext === 'pdf') cover = await extractPdfCover(buf);
      else if (ext === 'zip' || ext === 'cbz') cover = await extractZipCover(buf);

      // Auto-detect genres from EPUB metadata
      let categoryIds = []
      if (ext === 'epub') {
        const genres = await detectEpubGenres(buf)
        if (genres.length > 0) {
          categoryIds = await findOrCreateTags(genres)
          setLoadMsg(t.reading + ` (Đã phát hiện ${genres.length} thể loại: ${genres.join(', ')})`)
        }
      }

      const bookData = { name: file.name, ext, buf, cover, addedAt: Date.now(), categoryIds, favorite: false }
      const id = await dbPut('books', bookData)
      const bks = await dbGetAll('books')
      setBooks(bks)
      await openBook({ ...bookData, id })
    } catch(e) { alert(TRANSLATIONS[lang].err + e.message) }
    setLoading(false)
  }

  async function openBook(book) {
    setCurrentBook(book)
    setLoading(true); setLoadMsg(TRANSLATIONS[lang].opening)
    setView('reader')
    try {
      let chs = []
      if (book.ext === 'epub') chs = await parseEpub(book.buf)
      else if (book.ext === 'pdf') chs = await parsePdf(book.buf)
      else if (book.ext === 'zip' || book.ext === 'cbz') chs = await parseZip(book.buf, book.name)
      else if (book.ext === 'txt') chs = await parseTxt(book.buf)
      setChapters(chs)
      await dbPut('books', { ...book, totalChapters: chs.length })
      const bks = await dbGetAll('books')
      setBooks(bks)
      const prog = await dbGet('progress', book.id)
      const startChap = prog?.chapter || 0
      setCurChap(startChap)
      setProgressMap(prev => ({ ...prev, [book.id]: { chapter: startChap, totalChapters: chs.length } }))
    } catch(e) { alert(TRANSLATIONS[lang].err + e.message) }
    setLoading(false)
  }

  async function parseEpub(buf) {
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
          const t   = np.querySelector('navLabel text')?.textContent?.trim()
          if (src && t) ncx[src] = t
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
        const title = ncx[item.href] || chDoc.querySelector('h1,h2,h3')?.textContent?.trim() || `${TRANSLATIONS[lang].chapterTitle} ${chs.length+1}`
        chs.push({ title, type: 'html', content: chDoc.body?.innerHTML || html })
      } catch(e) {}
    }
    return chs
  }

  async function parsePdf(buf) {
    const pdf = await pdfjsLib.getDocument({ data: buf.slice(0) }).promise
    const chs = []
    for (let i = 0; i < pdf.numPages; i += 5) {
      const fr = i + 1, to = Math.min(i + 5, pdf.numPages)
      chs.push({ title: `${TRANSLATIONS[lang].pageTitle} ${fr}–${to}`, type: 'pdf', from: fr, to, pdf })
    }
    return chs
  }

  async function parseZip(buf, bookName) {
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

  async function parseTxt(buf) {
    const text = new TextDecoder('utf-8').decode(buf);
    const lines = text.split(/\r?\n/);
    const chs = [];
    let currentTitle = `${TRANSLATIONS[lang].chapterTitle} 1`;
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
       return chunks.map((chunk, idx) => ({ title: `${TRANSLATIONS[lang].chapterTitle} ${idx+1}`, type: 'html', content: `<div style="text-align:justify;">${chunk.split('\n').map(l => l?'<p style="margin-bottom:0.5em;text-indent:0.6em;text-align:justify;">'+l+'</p>':'<br/>').join('')}</div>` }));
    }
    return chs;
  }

  const goChapter = useCallback(async (idx, chs_arg, isPrev = false) => {
    const chs = chs_arg || chapters
    if (idx < 0 || idx >= chs.length) return

    if (scrollRef.current) {
      scrollRef.current.style.scrollBehavior = 'auto';
      scrollRef.current.scrollTop = 0;
      scrollRef.current.scrollLeft = 0;
    }

    setCurChap(idx)
    setChapInput('')

    requestAnimationFrame(() => {
      setTimeout(() => {
        if (scrollRef.current) {
          if (readMode === 'horizontal' && isPrev) {
            scrollRef.current.scrollLeft = scrollRef.current.scrollWidth - scrollRef.current.clientWidth;
          } else {
            scrollRef.current.scrollLeft = 0;
          }
          scrollRef.current.scrollTop = 0;
          scrollRef.current.style.scrollBehavior = 'smooth';
        }
      }, 10);
    });

    if (currentBook?.id) {
      await dbPut('progress', { bookId: currentBook.id, chapter: idx, updatedAt: Date.now() })
      setProgressMap(prev => ({ ...prev, [currentBook.id]: { ...prev[currentBook.id], chapter: idx } }))
    }
  }, [chapters, currentBook, readMode])

  useEffect(() => {
    const chapter = chapters[curChap];
    if (chapter && pageRef.current && chapter.type === 'html') {
        pageRef.current.innerHTML = chapter.content;
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0;
        }
    }
  }, [chapters, curChap]);

  useEffect(() => {
    if (!pageRef.current) return;
    const el = pageRef.current;
    el.style.fontFamily = font;
    el.style.fontSize = fontSize + 'px';
    el.style.lineHeight = lineH;
    el.style.background = THEMES[theme].bg;
    el.style.color = THEMES[theme].text;
  }, [theme, font, fontSize, lineH]);

  async function deleteBook(id, e) {
    e.stopPropagation()
    if (!confirm(TRANSLATIONS[lang].delConfirm)) return
    await dbDelete('books', id)
    await dbDelete('progress', id)
    const bks = await dbGetAll('books')
    setBooks(bks)
    if (currentBook?.id === id) { setCurrentBook(null); setView('library') }
  }

  useEffect(() => {
    async function toggle() {
      if (view === 'reader') {
        try { await KeepAwake.keepAwake() }
        catch (e) { console.warn('KeepAwake: enable fail', e) }
      } else {
        try { await KeepAwake.allowSleep() }
        catch (e) { console.warn('KeepAwake: disable fail', e) }
      }
    }
    toggle()
  }, [view])

  const PdfContent = ({ chunk, fontSize }) => {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!chunk || !containerRef.current) return;
        const container = containerRef.current;
        container.innerHTML = '';

        const render = async () => {
            const scale = Math.max(1.2, fontSize / 13);
            for (let pNum = chunk.from; pNum <= chunk.to; pNum++) {
                try {
                    const pdfPage = await chunk.pdf.getPage(pNum);
                    const viewport = pdfPage.getViewport({ scale });
                    const canvas = document.createElement('canvas');
                    canvas.style.cssText = 'display:block; margin: 0 auto 16px; max-width:100%;';
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    await pdfPage.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
                    if (containerRef.current) {
                        container.appendChild(canvas);
                    }
                } catch (e) {}
            }
        };
        render();
    }, [chunk, fontSize]);

    return <div ref={containerRef}></div>;
  };

  const th = THEMES[theme]
  const isMobile = window.innerWidth < 640

  const hPaddingStr = isMobile ? '10px 10px' : '48px 48px';

  const isSidebarVisible = view === 'reader' && showSidebar && !isMobile;

  const ac = APP_THEMES[appTheme] || APP_THEMES.navy

  const chapter = chapters[curChap];

  const btnStyle = { background: ac.el, border: `1px solid ${ac.border}`, color: ac.text, borderRadius: 8, padding: '10px 16px', fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }
  const selStyle = { background: ac.el, border: `1px solid ${ac.border}`, color: ac.text, borderRadius: 5, padding: '4px 7px', fontSize: 12, cursor: 'pointer' }

  const toggleFullscreen = async () => {
    const { StatusBar } = await import('@capacitor/status-bar');
    if (!isFullscreen) {
      try { await StatusBar.hide(); } catch(e) {}
    } else {
      try { await StatusBar.show(); } catch(e) {}
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleScreenTouch = async (e) => {
    if (isFullscreen) {
      try {
        const { StatusBar } = await import('@capacitor/status-bar');
        await StatusBar.hide();
      } catch(err) {}
    }

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }

    if (e.detail === tapConfig) {
      toggleFullscreen();
      return;
    }

    if (e.detail === 1 && tapConfig !== 1) {
      const { clientX } = e;
      const width = window.innerWidth;

      clickTimeoutRef.current = setTimeout(() => {
        if (readMode === 'horizontal') {
          if (clientX < width * 0.3) turnPage(-1);
          else if (clientX > width * 0.7) turnPage(1);
        } else if (!isFullscreen) {
          if (clientX < width * 0.3 && curChap > 0) goChapter(curChap - 1, null, true);
          else if (clientX > width * 0.7 && curChap < chapters.length - 1) goChapter(curChap + 1);
        }
      }, 195);
    }
  };

  const turnPage = (direction) => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      const currentPage = Math.round(scrollLeft / clientWidth);

      if (direction === 1) {
        if ((currentPage + 1) * clientWidth >= scrollWidth - 5) {
           if (curChap < chapters.length - 1) goChapter(curChap + 1);
        } else {
           scrollRef.current.scrollTo({ left: (currentPage + 1) * clientWidth, behavior: 'smooth' });
        }
      } else {
        if (currentPage <= 0) {
           if (curChap > 0) goChapter(curChap - 1, null, true);
        } else {
           scrollRef.current.scrollTo({ left: (currentPage - 1) * clientWidth, behavior: 'smooth' });
        }
      }
    }
  }

  const handleSwipe = (direction) => {
    if (readMode === 'horizontal') {
      turnPage(direction)
    }
  }

  const handleTouchStart = (e) => {
    setTouchStartX(e.changedTouches[0].screenX)
    setTouchStartY(e.changedTouches[0].screenY)
  }

  const handleTouchEnd = (e) => {
    if (touchStartX === null || touchStartY === null) return
    const touchEndX = e.changedTouches[0].screenX
    const touchEndY = e.changedTouches[0].screenY
    const deltaX = touchStartX - touchEndX
    const deltaY = touchStartY - touchEndY

    if (readMode === 'horizontal' && Math.abs(deltaX) > 30 && Math.abs(deltaX) > Math.abs(deltaY)) {
      handleSwipe(deltaX > 0 ? 1 : -1)
    }
    else if (readMode === 'vertical' && Math.abs(deltaY) > 50) {
      if (scrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
        if (deltaY > 0 && scrollTop + clientHeight >= scrollHeight - 5) {
          if (curChap < chapters.length - 1) goChapter(curChap + 1)
        } else if (deltaY < 0 && scrollTop <= 5) {
          if (curChap > 0) goChapter(curChap - 1, null, true)
        }
      }
    }
    setTouchStartX(null)
    setTouchStartY(null)
  }

  // --- RENDER: Category Sidebar Content (shared between desktop sidebar and mobile menu) ---
  const CategoryList = ({ compact, onSelect }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* All */}
      <div
        onClick={() => { setSelectedCategoryId('all'); onSelect?.(); }}
        style={{
          padding: compact ? '8px 12px' : '9px 12px', cursor: 'pointer', borderRadius: 6, fontSize: 13,
          background: selectedCategoryId === 'all' ? ac.border : 'transparent',
          color: selectedCategoryId === 'all' ? ac.accent : ac.text,
          fontWeight: selectedCategoryId === 'all' ? 'bold' : 'normal',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderLeft: selectedCategoryId === 'all' ? `3px solid ${ac.accent}` : '3px solid transparent'
        }}
      >
        <span>{t.all}</span>
        <span style={{ fontSize: 11, opacity: 0.7 }}>{books.length}</span>
      </div>

      {/* Favorites */}
      <div
        onClick={() => { setSelectedCategoryId('favorites'); onSelect?.(); }}
        style={{
          padding: compact ? '8px 12px' : '9px 12px', cursor: 'pointer', borderRadius: 6, fontSize: 13,
          background: selectedCategoryId === 'favorites' ? ac.border : 'transparent',
          color: selectedCategoryId === 'favorites' ? ac.accent : ac.text,
          fontWeight: selectedCategoryId === 'favorites' ? 'bold' : 'normal',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderLeft: selectedCategoryId === 'favorites' ? `3px solid ${ac.accent}` : '3px solid transparent'
        }}
      >
        <span>⭐ {t.favorites}</span>
        <span style={{ fontSize: 11, opacity: 0.7 }}>{favCount}</span>
      </div>

      {/* Uncategorized */}
      <div
        onClick={() => { setSelectedCategoryId('uncategorized'); onSelect?.(); }}
        style={{
          padding: compact ? '8px 12px' : '9px 12px', cursor: 'pointer', borderRadius: 6, fontSize: 13,
          background: selectedCategoryId === 'uncategorized' ? ac.border : 'transparent',
          color: selectedCategoryId === 'uncategorized' ? ac.accent : ac.text,
          fontWeight: selectedCategoryId === 'uncategorized' ? 'bold' : 'normal',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderLeft: selectedCategoryId === 'uncategorized' ? `3px solid ${ac.accent}` : '3px solid transparent'
        }}
      >
        <span>{t.uncategorized}</span>
        <span style={{ fontSize: 11, opacity: 0.7 }}>{uncatCount}</span>
      </div>

      {/* Divider */}
      {sortedCategories.length > 0 && (
        <div style={{ height: 1, background: ac.border, margin: '4px 12px' }} />
      )}

      {/* Tags */}
      {sortedCategories.map(cat => (
        <div key={cat.id}
          onClick={() => { setSelectedCategoryId(cat.id); onSelect?.(); }}
          onContextMenu={(e) => { e.preventDefault(); setTagContextMenu({ tagId: cat.id, x: e.clientX, y: e.clientY }); }}
          style={{
            padding: compact ? '8px 12px' : '9px 12px', cursor: 'pointer', borderRadius: 6, fontSize: 13,
            background: selectedCategoryId === cat.id ? ac.border : 'transparent',
            color: selectedCategoryId === cat.id ? ac.accent : ac.text,
            fontWeight: selectedCategoryId === cat.id ? 'bold' : 'normal',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderLeft: selectedCategoryId === cat.id ? `3px solid ${cat.color}` : '3px solid transparent'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color, flexShrink: 0, boxShadow: `0 0 6px ${cat.color}40` }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {cat.pinned ? '📌 ' : ''}{cat.name}
            </span>
          </span>
          <span style={{ fontSize: 11, opacity: 0.7 }}>{getCatCount(cat.id)}</span>
        </div>
      ))}

      {/* New Tag button */}
      <div
        onClick={() => { setEditingTag(null); setShowTagModal(true); }}
        style={{
          padding: '8px 12px', cursor: 'pointer', borderRadius: 6, fontSize: 13,
          color: ac.textMuted, display: 'flex', alignItems: 'center', gap: 6,
          opacity: 0.7, marginTop: 4
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
        onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
      >
        <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> {t.newTag}
      </div>

      {/* Divider + Statistics button */}
      <div style={{ height: 1, background: ac.border, margin: '4px 12px' }} />
      <div
        onClick={() => { setShowStats(!showStats); setSelectedCategoryId('all'); onSelect?.(); }}
        style={{
          padding: '8px 12px', cursor: 'pointer', borderRadius: 6, fontSize: 13,
          color: showStats ? ac.accent : ac.textMuted,
          background: showStats ? ac.border : 'transparent',
          display: 'flex', alignItems: 'center', gap: 6,
          opacity: showStats ? 1 : 0.7
        }}
        onMouseEnter={e => { if (!showStats) e.currentTarget.style.opacity = '1' }}
        onMouseLeave={e => { if (!showStats) e.currentTarget.style.opacity = '0.7' }}
      >
        {t.statistics}
      </div>
    </div>
  )

  const sidebarStyle = {
    position: 'fixed',
    top: 0,
    left: isMenuOpen ? 0 : '-350px',
    width: '350px',
    height: '100vh',
    background: ac.bg,
    color: ac.text,
    transition: 'left 0.3s ease',
    zIndex: 1000,
    padding: '20px',
    boxShadow: isMenuOpen ? '2px 0 15px rgba(0,0,0,0.7)' : 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    overflowY: 'auto'
  }

  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(0,0,0,0.6)',
    display: isMenuOpen ? 'block' : 'none',
    zIndex: 999,
    cursor: 'pointer'
  }

  const mainContainerStyle = {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100vh',
    margin: 0,
    padding: 0,
    overflowX: 'hidden',
    background: ac.bg,
    color: ac.text,
    fontFamily: 'sans-serif',
    paddingTop: isFullscreen ? 0 : 'env(safe-area-inset-top)'
  }

  return (

    <div style={mainContainerStyle}>

      {/* Overlay khi mở menu */}
      <div style={overlayStyle} onClick={() => setIsMenuOpen(false)} />

      {/* Tag Context Menu */}
      {tagContextMenu && (() => {
        const cat = categories.find(c => c.id === tagContextMenu.tagId)
        if (!cat) { setTagContextMenu(null); return null }
        return (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 2000 }} onClick={() => setTagContextMenu(null)} />
            <div style={{
              position: 'fixed', zIndex: 2001,
              left: Math.min(tagContextMenu.x, window.innerWidth - 180),
              top: Math.min(tagContextMenu.y, window.innerHeight - 160),
              ...DROP_STYLE.container, padding: '4px 0', minWidth: 160
            }}>
              <div style={{ ...DROP_STYLE.item, ...DROP_STYLE.itemNormal }}
                onClick={() => { setEditingTag(cat); setShowTagModal(true); setTagContextMenu(null); }}>
                ✏️ {t.editTag}
              </div>
              <div style={{ ...DROP_STYLE.item, ...DROP_STYLE.itemNormal }}
                onClick={() => { togglePinTag(cat.id); setTagContextMenu(null); }}>
                📌 {cat.pinned ? t.unpinTag : t.pinTag}
              </div>
              <div style={{ ...DROP_STYLE.item, color: '#ef4444' }}
                onClick={() => { deleteTag(cat.id); }}>
                🗑️ {t.deleteTag}
              </div>
            </div>
          </>
        )
      })()}

      {/* Nút Menu cố định */}
      {!isFullscreen && (
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          style={{
            position: 'fixed', top: 'env(safe-area-inset-top)', left: 0, zIndex: 1002,
            background: 'transparent', border: 'none', color: ac.text,
            borderRadius: 0, fontSize: '20px',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '52px', height: '52px', padding: 0,
            overflow: 'hidden'
          }}
        >
          <div style={{
            position: 'absolute',
            inset: '6px',
            borderRadius: '10px',
            transition: 'background 0.2s',
            zIndex: -1
          }} className="menu-btn-bg" />
          {isMenuOpen ? '✕' : '☰'}
        </button>
      )}

      {/* Sidebar Menu (Mobile: chứa tất cả) */}
      <div style={{...sidebarStyle, padding: 'calc(env(safe-area-inset-top) + 64px) 16px 20px 16px'}}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ margin: 0, fontSize: 18, color: ac.accent }}>📚 Doc Sach</h3>
        </div>

        {/* Nav buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          <Btn style={btnStyle} onClick={() => { setView('library'); setIsMenuOpen(false); }}>{t.library}</Btn>
          <label style={{...btnStyle, margin: 0, textAlign: 'center'}}>
            {t.add}
            <input type="file" accept=".epub,.pdf,.zip,.cbz,.txt" style={{ display:'none' }} onChange={e => { handleFile(e.target.files[0]); setIsMenuOpen(false); }}/>
          </label>
        </div>

        {/* Categories section in menu */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: ac.textMuted, marginBottom: 4, marginTop: 4 }}>
            {t.categories}
          </div>
          <CategoryList compact onSelect={() => setIsMenuOpen(false)} />
        </div>

        {view === 'reader' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, marginTop: 4 }}>
            <div
              onClick={() => setShowChapterGrid(!showChapterGrid)}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: ac.el, padding: '8px 10px', borderRadius: '6px' }}
            >
              <h4 style={{ margin: 0, color: ac.accent, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>📖 {currentBook?.name}</h4>
              <span style={{ fontSize: 12, color: ac.textMuted, marginLeft: 8 }}>{showChapterGrid ? '▼' : '▶'}</span>
            </div>

            <span style={{ fontSize: 13, color: ac.textMuted, marginTop: 4 }}>{t.curChap}: {chapters.length ? `${curChap+1}/${chapters.length}` : ''}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn style={btnStyle} onClick={() => goChapter(curChap - 1)} disabled={curChap <= 0}>{t.prev}</Btn>
              <input
                placeholder={t.enterChap}
                value={chapInput}
                onChange={e => setChapInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const n = parseInt(chapInput) - 1
                    if (!isNaN(n)) {
                        goChapter(Math.max(0, Math.min(n, chapters.length - 1)));
                        setIsMenuOpen(false);
                    }
                  }
                }}
                style={{ flex: 1, background: ac.el, border: `1px solid ${ac.border}`, color: ac.text, borderRadius:5, padding:'3px 8px', fontSize:12, minWidth: 0, textAlign: 'center' }}
              />
              <Btn style={btnStyle} onClick={() => goChapter(curChap + 1)} disabled={curChap >= chapters.length - 1}>{t.next}</Btn>
            </div>

            {showChapterGrid && (
              <div ref={chapterListRef} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                maxHeight: '200px',
                overflowY: 'auto',
                background: ac.bg,
                padding: '6px',
                borderRadius: '6px',
                border: `1px solid ${ac.border}`,
                marginTop: '4px'
              }}>
                {chapters.map((ch, i) => (
                  <div
                    key={i}
                    onClick={() => { goChapter(i); setIsMenuOpen(false); }}
                    style={{
                      padding: '8px 12px', textAlign: 'left',
                      background: curChap === i ? ac.border : ac.bg,
                      color: curChap === i ? ac.accent : ac.text,
                      borderRadius: '4px', fontSize: '13px', cursor: 'pointer',
                      fontWeight: curChap === i ? 'bold' : 'normal',
                      borderLeft: curChap === i ? `3px solid ${ac.accent}` : '3px solid transparent',
                      borderBottom: `1px solid ${ac.border}`,
                      lineHeight: '1.4', wordBreak: 'break-word'
                    }}
                  >
                    {ch.title}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <hr style={{ border: `0.5px solid ${ac.border}`, margin: 0, flexShrink: 0 }} />

        {/* Settings section (moved to bottom in mobile menu) */}
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: ac.textMuted }}>{t.setting}</div>

        {/* Font size */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 13, color: ac.textMuted }}>{t.fontSize}: {fontSize}px</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn style={btnStyle} onClick={() => setFontSize(s => Math.max(10, s-2))}>A−</Btn>
            <Btn style={btnStyle} onClick={() => setFontSize(s => Math.min(48, s+2))}>A+</Btn>
          </div>
        </div>

        {/* Font */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 13, color: ac.textMuted }}>{t.font}</span>
          <Dropdown value={font} onChange={setFont} ac={ac} btnStyle={btnStyle}
            options={FONTS.map(f => ({ value: f.value, label: f.label }))} />
        </div>

        {/* Theme */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, position: 'relative' }}>
          <span style={{ fontSize: 13, color: ac.textMuted }}>{t.theme}</span>
          <div
            onClick={() => setShowReadThemeDropdown(!showReadThemeDropdown)}
            style={{...selStyle, width: '100%', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}
          >
            <span style={{
              width: 20, height: 20, borderRadius: 4, flexShrink: 0,
              background: THEMES[theme]?.bg || '#ffffff',
              border: '2px solid rgba(255,255,255,0.35)',
              boxShadow: '0 0 0 1px rgba(0,0,0,0.3)'
            }} />
            <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.themes[theme]}</span>
            <span style={{ fontSize: 10, opacity: 0.5 }}>▼</span>
          </div>
          {showReadThemeDropdown && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 1 }} onClick={() => setShowReadThemeDropdown(false)} />
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 2, ...DROP_STYLE.container, maxHeight: 200, overflowY: 'auto', marginTop: 4 }}>
                {Object.entries(THEMES).map(([k,v]) => (
                  <div
                    key={k}
                    onClick={() => { setTheme(k); setShowReadThemeDropdown(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, ...DROP_STYLE.item, ...(theme === k ? DROP_STYLE.itemSelected : DROP_STYLE.itemNormal) }}
                  >
                    <span style={{
                      width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                      background: v.bg,
                      border: '2px solid rgba(255,255,255,0.35)',
                      boxShadow: '0 0 0 1px rgba(0,0,0,0.3)'
                    }} />
                    <span>{t.themes[k]}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Line height */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 13, color: ac.textMuted }}>{t.lineHeight}</span>
          <Dropdown value={lineH} onChange={v => setLineH(parseFloat(v))} ac={ac} btnStyle={btnStyle}
            options={[{ value: 1.5, label: t.lineNarrow }, { value: 1.85, label: t.lineNormal }, { value: 2.2, label: t.lineWide }]} />
        </div>

        {/* Language */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 13, color: ac.textMuted }}>{t.lang}</span>
          <Dropdown value={lang} onChange={setLang} ac={ac} btnStyle={btnStyle}
            options={[{ value: 'vi', label: 'Tiếng Việt' }, { value: 'en', label: 'English' }, { value: 'zh_cn', label: '简体中文' }, { value: 'zh_tw', label: '繁體中文' }]} />
        </div>

        {/* App theme */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, position: 'relative' }}>
          <span style={{ fontSize: 13, color: ac.textMuted }}>{t.appThemeTitle}</span>
          <div
            onClick={() => setShowThemeDropdown(!showThemeDropdown)}
            style={{...selStyle, width: '100%', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none', position: 'relative' }}
          >
            <span style={{
              width: 20, height: 20, borderRadius: 4, flexShrink: 0,
              background: APP_THEMES[appTheme]?.bg || '#0f172a',
              border: '2px solid rgba(255,255,255,0.35)',
              boxShadow: '0 0 0 1px rgba(0,0,0,0.3)'
            }} />
            <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.appThemes[appTheme]}</span>
            <span style={{ fontSize: 10, opacity: 0.5 }}>▼</span>
          </div>
          {showThemeDropdown && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 1 }} onClick={() => setShowThemeDropdown(false)} />
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 2, ...DROP_STYLE.container, maxHeight: 220, overflowY: 'auto', marginTop: 4 }}>
                {Object.keys(APP_THEMES).map(k => (
                  <div
                    key={k}
                    onClick={() => { setAppTheme(k); setShowThemeDropdown(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, ...DROP_STYLE.item, ...(appTheme === k ? DROP_STYLE.itemSelected : DROP_STYLE.itemNormal) }}
                  >
                    <span style={{
                      width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                      background: APP_THEMES[k].bg,
                      border: '2px solid rgba(255,255,255,0.35)',
                      boxShadow: '0 0 0 1px rgba(0,0,0,0.3)'
                    }} />
                    <span>{t.appThemes[k]}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Tap config */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 13, color: ac.textMuted }}>{t.tapToFs}</span>
          <Dropdown value={tapConfig} onChange={v => setTapConfig(Number(v))} ac={ac} btnStyle={btnStyle}
            options={[{ value: 1, label: t.tap1 }, { value: 2, label: t.tap2 }, { value: 3, label: t.tap3 }]} />
        </div>

        {/* Read mode */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 13, color: ac.textMuted }}>{t.readMode}</span>
          <Dropdown value={readMode} onChange={setReadMode} ac={ac} btnStyle={btnStyle}
            options={[{ value: 'vertical', label: t.modeVertical }, { value: 'horizontal', label: t.modeHorizontal }]} />
        </div>

        <hr style={{ border: `0.5px solid ${ac.border}`, margin: 0, flexShrink: 0 }} />

        {/* Backup & Restore */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 13, color: ac.textMuted }}>{t.backup}</span>
          <span style={{ fontSize: 11, color: ac.textMuted }}>{t.backupDesc}</span>
          <Btn style={btnStyle} onClick={async () => { const res = await exportData(); alert(res.message); }}>{t.backup}</Btn>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 13, color: ac.textMuted }}>{t.restore}</span>
          <span style={{ fontSize: 11, color: ac.textMuted }}>{t.restoreDesc}</span>
          <label style={{...btnStyle, margin: 0, textAlign: 'center', cursor: 'pointer'}}>
            {t.restore}
            <input type="file" accept=".json" style={{ display:'none' }} onChange={async (e) => { if(e.target.files[0]) { const res = await importData(e.target.files[0]); alert(res.message); if(res.status === 'success') location.reload(); }}}/>
          </label>
        </div>
      </div>

      {/* Top Bar */}
      {!isFullscreen && (
      <div style={{ background: ac.bg, padding:'0 12px 0 52px', display:'flex', gap:'8px', alignItems:'center', borderBottom: `1px solid ${ac.border}`, flexShrink:0, height: '52px' }}>
        <div style={{ flex: 1, fontSize: 16, fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: ac.accent, display: 'flex', alignItems: 'center', height: '100%' }}>
          {view === 'reader' ? currentBook?.name : t.library}
        </div>
        {/* Search & Select buttons (only in library view) */}
        {view === 'library' && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              placeholder={t.search}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                background: ac.el, border: `1px solid ${ac.border}`, color: ac.text,
                borderRadius: 6, padding: '6px 10px', fontSize: 12, width: isMobile ? 100 : 180,
                outline: 'none'
              }}
            />
            <button
              onClick={() => { if (isSelectMode) exitSelectMode(); else setIsSelectMode(true); }}
              style={{ ...btnStyle, padding: '6px 10px', fontSize: 12, background: isSelectMode ? ac.accent : ac.el, color: isSelectMode ? ac.bg : ac.text }}
            >
              {isSelectMode ? t.cancel : t.select}
            </button>
          </div>
        )}
      </div>
      )}

      <div style={{ display:'flex', flex:1, overflow:'hidden', position:'relative' }}>

        {/* Desktop: Category Sidebar (library view only) */}
        {view === 'library' && !isMobile && (
          <div style={{ width: 220, background: ac.bg, borderRight: `1px solid ${ac.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>
            <div style={{ padding: '10px 12px', fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: ac.textMuted, borderBottom: `1px solid ${ac.border}` }}>
              {t.categories}
            </div>
            <div style={{ overflowY: 'auto', flex: 1, padding: '8px 4px' }}>
              <CategoryList compact={false} />
            </div>
          </div>
        )}

        {/* Reader TOC sidebar */}
        {view === 'reader' && showSidebar && !isMobile && (
          <div style={{ width:220, background: ac.bg, borderRight: `1px solid ${ac.border}`, display:'flex', flexDirection:'column', flexShrink:0, overflow:'hidden' }}>
            <div style={{ padding:'8px 12px', fontSize:10, letterSpacing:'.08em', textTransform:'uppercase', color: ac.textMuted, borderBottom: `1px solid ${ac.border}` }}>{t.toc}</div>
            <div style={{ overflowY:'auto', flex:1 }}>
              {chapters.map((ch, i) => (
                <div key={i} onClick={() => goChapter(i)}
                  style={{ padding:'7px 12px', fontSize:12, color: i===curChap ? ac.accent : ac.text, borderLeft: i===curChap ? `3px solid ${ac.accent}` : '3px solid transparent', cursor:'pointer', lineHeight:1.4, background: i===curChap ? ac.border : ac.bg, fontWeight: i===curChap ? 'bold' : 'normal' }}>
                  {ch.title}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LIBRARY VIEW */}
        {view === 'library' && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

            {/* STATISTICS VIEW */}
            {showStats ? (
              <div style={{ flex:1, overflowY:'auto', padding: isMobile ? 16 : 32 }}>
                <h2 style={{ color: ac.accent, fontSize: 20, fontWeight: 400, marginBottom: 24 }}>{t.statsTitle}</h2>

                {/* Summary cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 32 }}>
                  {[
                    { label: t.statsTotal, value: books.length, icon: '📚', color: ac.accent },
                    { label: t.statsFavorites, value: favCount, icon: '⭐', color: '#fbbf24' },
                    { label: t.statsUncategorized, value: uncatCount, icon: '📂', color: '#94a3b8' },
                    { label: t.statsCompleted, value: books.filter(b => progressMap[b.id]?.chapter >= b.totalChapters - 1 && b.totalChapters > 0).length, icon: '✅', color: '#4ade80' }
                  ].map((card, i) => (
                    <div key={i} style={{
                      background: ac.el, border: `1px solid ${ac.border}`, borderRadius: 10, padding: 16,
                      textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8
                    }}>
                      <div style={{ fontSize: 28 }}>{card.icon}</div>
                      <div style={{ fontSize: 28, fontWeight: 'bold', color: card.color }}>{card.value}</div>
                      <div style={{ fontSize: 12, color: ac.textMuted }}>{card.label}</div>
                    </div>
                  ))}
                </div>

                {/* Per-tag bar chart */}
                {categories.length > 0 ? (
                  <div style={{ marginBottom: 32 }}>
                    <h3 style={{ color: ac.text, fontSize: 15, fontWeight: 400, marginBottom: 16 }}>{t.statsByTag}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {sortedCategories.map(cat => {
                        const count = getCatCount(cat.id)
                        const pct = books.length > 0 ? Math.round((count / books.length) * 100) : 0
                        return (
                          <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 120, fontSize: 12, color: ac.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right', flexShrink: 0 }}>
                              {cat.pinned ? '📌 ' : ''}{cat.name}
                            </div>
                            <div style={{ flex: 1, height: 22, background: ac.bg, borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                              <div style={{
                                height: '100%', width: `${Math.max(pct, 2)}%`,
                                background: cat.color, borderRadius: 6,
                                transition: 'width 0.5s ease',
                                minWidth: count > 0 ? 20 : 0
                              }} />
                            </div>
                            <div style={{ width: 60, fontSize: 12, color: ac.textMuted, textAlign: 'left', flexShrink: 0 }}>
                              <strong style={{ color: ac.text }}>{count}</strong> {t.books} ({pct}%)
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: ac.textMuted, padding: 32, fontSize: 14 }}>
                    {t.noData}
                  </div>
                )}

                {/* Reading progress section */}
                <div>
                  <h3 style={{ color: ac.text, fontSize: 15, fontWeight: 400, marginBottom: 16 }}>{t.statsReading}</h3>
                  <div style={{ background: ac.el, border: `1px solid ${ac.border}`, borderRadius: 10, padding: 16 }}>
                    {(() => {
                      const completed = books.filter(b => progressMap[b.id]?.chapter >= b.totalChapters - 1 && b.totalChapters > 0).length
                      const inProgress = books.filter(b => progressMap[b.id]?.chapter > 0 && b.totalChapters > 0 && progressMap[b.id].chapter < b.totalChapters - 1).length
                      const notStarted = books.filter(b => !progressMap[b.id] || progressMap[b.id]?.chapter === 0).length
                      const total = books.length || 1
                      return (
                        <div style={{ display: 'flex', height: 28, borderRadius: 8, overflow: 'hidden', gap: 2 }}>
                          {completed > 0 && (
                            <div style={{ width: `${(completed/total)*100}%`, background: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#000', fontWeight: 'bold' }}>
                              {completed > 0 && `${completed} ${t.statsCompleted}`}
                            </div>
                          )}
                          {inProgress > 0 && (
                            <div style={{ width: `${(inProgress/total)*100}%`, background: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#000', fontWeight: 'bold' }}>
                              {inProgress > 0 && `${inProgress} ${t.statsInProgress}`}
                            </div>
                          )}
                          {notStarted > 0 && (
                            <div style={{ width: `${(notStarted/total)*100}%`, background: ac.border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: ac.textMuted }}>
                              {notStarted > 0 && `${notStarted} ${t.statsNotStarted}`}
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </div>
            ) : (
              /* BOOK GRID (normal view) */
              <div style={{ flex:1, overflowY:'auto', padding: isMobile ? 12 : 24 }}>
                {filteredBooks.length === 0 && (
                  <div style={{ color: ac.textMuted, textAlign:'center', marginTop:60 }}>
                    <div style={{ fontSize:48, opacity:.3 }}>📖</div>
                    <p style={{ marginTop:12 }}>{searchQuery ? 'Không tìm thấy sách phù hợp' : t.noBooks}</p>
                  </div>
                )}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))', gap:16 }}>
                  {filteredBooks.map(b => {
                  const bookTags = categories.filter(c => b.categoryIds?.includes(c.id))
                  const isSelected = selectedBookIds.has(b.id)
                  return (
                    <div key={b.id}
                      onClick={() => {
                        if (isSelectMode) { toggleSelectBook(b.id); return }
                        openBook(b)
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        if (!isSelectMode) { setIsSelectMode(true); setSelectedBookIds(new Set([b.id])) }
                      }}
                      onTouchStart={() => {
                        if (!isSelectMode) {
                          longPressRef.current = setTimeout(() => { setIsSelectMode(true); setSelectedBookIds(new Set([b.id])); }, 500)
                        }
                      }}
                      onTouchEnd={() => { if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null } }}
                      onTouchMove={() => { if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null } }}
                      style={{
                        background: isSelected ? ac.accent + '30' : ac.el,
                        border: isSelected ? `2px solid ${ac.accent}` : `1px solid ${ac.border}`,
                        borderRadius:8, padding:12, cursor:'pointer', position:'relative', textAlign: 'center',
                        transition: 'background 0.15s, border 0.15s'
                      }}
                      onMouseEnter={e => { if (!isSelectMode) e.currentTarget.style.background = ac.border }}
                      onMouseLeave={e => { if (!isSelectMode) e.currentTarget.style.background = isSelected ? ac.accent + '30' : ac.el }}
                    >
                      {/* Select checkbox */}
                      {isSelectMode && (
                        <div style={{
                          position: 'absolute', top: 8, left: 8, zIndex: 2,
                          width: 22, height: 22, borderRadius: '50%',
                          background: isSelected ? ac.accent : ac.el,
                          border: `2px solid ${isSelected ? ac.accent : ac.border}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: isSelected ? ac.bg : 'transparent', fontSize: 12, fontWeight: 'bold'
                        }}>
                          {isSelected ? '✓' : ''}
                        </div>
                      )}

                      {b.cover ? (
                        <img src={b.cover} alt={b.name} style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: 4, marginBottom: 8, boxShadow: '0 4px 8px rgba(0,0,0,0.3)' }} />
                      ) : (
                        <div style={{ fontSize:48, marginBottom:8 }}>{b.ext==='epub'?'📗':b.ext==='pdf'?'📄':'📚'}</div>
                      )}

                      <div style={{ fontSize:13, color: ac.textMuted, lineHeight:1.4, wordBreak:'break-word', fontWeight: '500', marginBottom: 6 }}>{b.name}</div>

                      {/* Tag dots */}
                      {bookTags.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                          {bookTags.slice(0, 3).map(tag => (
                            <span key={tag.id} title={tag.name} style={{
                              width: 8, height: 8, borderRadius: '50%', background: tag.color,
                              boxShadow: `0 0 4px ${tag.color}60`, flexShrink: 0
                            }} />
                          ))}
                          {bookTags.length > 3 && (
                            <span style={{ fontSize: 10, color: ac.textMuted }}>+{bookTags.length - 3}</span>
                          )}
                        </div>
                      )}

                      {/* Favorite star */}
                      {b.favorite && (
                        <div style={{ position: 'absolute', top: 6, right: 6, fontSize: 14, color: '#fbbf24' }}>⭐</div>
                      )}

                      {b.totalChapters && (
                        <div style={{ fontSize: 11, color: ac.accent, marginTop: 4, opacity: 0.8 }}>
                          📖 {(progressMap[b.id]?.chapter ?? 0) + 1}/{b.totalChapters} {t.chapterTitle.toLowerCase()}
                        </div>
                      )}

                      {!isSelectMode && (
                        <>
                          {/* Quick tag button */}
                          {categories.length > 0 && (
                            <button onClick={e => { e.stopPropagation(); setSelectedBookIds(new Set([b.id])); setShowBulkTagModal(true); }}
                              style={{ position:'absolute', bottom: 6, right: 6, background: ac.el, border: `1px solid ${ac.border}`, borderRadius: '50%', color: ac.textMuted, cursor:'pointer', fontSize: 11, width: 22, height: 22, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 4px rgba(0,0,0,0.2)' }}
                              title="Gán tag">🏷️</button>
                          )}
                          <button onClick={e => { e.stopPropagation(); toggleFavorite(b.id); }}
                            style={{ position:'absolute', top: 6, left: 6, background: 'transparent', border: 'none', cursor:'pointer', fontSize: 14, opacity: b.favorite ? 1 : 0.3 }}
                            title={b.favorite ? 'Bỏ yêu thích' : 'Yêu thích'}>
                            {b.favorite ? '⭐' : '☆'}
                          </button>
                          <button onClick={e => deleteBook(b.id, e)}
                            style={{ position:'absolute', top:-5, right:-5, background: ac.bg, border:`1px solid ${ac.border}`, borderRadius: '50%', color: ac.textMuted, cursor:'pointer', fontSize:14, width: 24, height: 24, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 4px rgba(0,0,0,0.2)' }}>✕</button>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            )}

            {/* Bulk Action Bottom Bar */}
            {isSelectMode && selectedBookIds.size > 0 && (
              <div style={{
                background: ac.el, borderTop: `1px solid ${ac.border}`,
                padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, flexWrap: 'wrap'
              }}>
                <span style={{ fontSize: 12, color: ac.textMuted, marginRight: 8 }}>
                  {selectedBookIds.size} {t.booksSelected}
                </span>
                <button onClick={() => setShowBulkTagModal(true)}
                  style={{ ...btnStyle, padding: '8px 14px', fontSize: 13 }}>
                  {t.assignTag}
                </button>
                <button onClick={bulkToggleFavorite}
                  style={{ ...btnStyle, padding: '8px 14px', fontSize: 13 }}>
                  ⭐ {t.favorites}
                </button>
                <button onClick={bulkDelete}
                  style={{ ...btnStyle, padding: '8px 14px', fontSize: 13, background: '#7f1d1d', border: '1px solid #991b1b' }}>
                  {t.deleteSelected}
                </button>
                <button onClick={exitSelectMode}
                  style={{ ...btnStyle, padding: '8px 14px', fontSize: 13 }}>
                  {t.cancel}
                </button>
              </div>
            )}
          </div>
        )}

        {/* READER VIEW */}
        {view === 'reader' && (
          <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
            {chapter?.type === 'manga' ? (
              <div ref={scrollRef}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onClick={handleScreenTouch}
                style={{
                  flex: 1, overflowY: readMode === 'vertical' ? 'auto' : 'hidden',
                  overflowX: readMode === 'horizontal' ? 'auto' : 'hidden',
                  scrollBehavior: 'smooth',
                  background: isFullscreen || isMobile ? th.bg : '#0a0a0a',
                  display: 'flex',
                  flexDirection: readMode === 'horizontal' ? 'row' : 'column',
                  scrollSnapType: readMode === 'horizontal' ? 'x mandatory' : 'none'
                }}>
                {chapter.urls.map((url, idx) => (
                  <div key={idx} style={{
                    flexShrink: 0,
                    width: '100%',
                    maxWidth: readMode === 'horizontal' ? 'none' : 800,
                    margin: '0 auto',
                    scrollSnapAlign: 'start',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: readMode === 'horizontal' ? 'center' : 'flex-start'
                  }}>
                    {readMode === 'horizontal' ? (
                      <TransformWrapper initialScale={1} minScale={1} maxScale={5} doubleClick={{ disabled: true }}>
                        <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center' }}>
                          <img src={url} alt={`Page ${idx + 1}`} style={{
                            width: 'auto',
                            maxWidth: '100%',
                            height: '100vh',
                            objectFit: 'contain',
                            display: 'block'
                          }} loading="lazy" />
                        </TransformComponent>
                      </TransformWrapper>
                    ) : (
                      <img src={url} alt={`Page ${idx + 1}`} style={{
                        width: '100%',
                        height: 'auto',
                        display: 'block',
                        margin: 0,
                        padding: 0
                      }} loading="lazy" />
                    )}
                  </div>
                ))}
              </div>
            ) : chapter?.type === 'pdf' ? (
              <div ref={scrollRef}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                style={{
                  flex: 1, overflowY: readMode === 'vertical' ? 'auto' : 'hidden',
                  overflowX: readMode === 'horizontal' ? 'auto' : 'hidden',
                  scrollBehavior: 'smooth',
                  background: isFullscreen || isMobile ? th.bg : '#0a0a0a',
                  display: 'flex',
                  flexDirection: readMode === 'horizontal' ? 'row' : 'column',
                  scrollSnapType: readMode === 'horizontal' ? 'x mandatory' : 'none'
                }}>
                <div onClick={handleScreenTouch} style={{
                    flexShrink: 0,
                    width: '100%',
                    maxWidth: readMode === 'horizontal' ? 'none' : 800,
                    margin: '0 auto',
                    scrollSnapAlign: 'start',
                    display: 'flex',
                    justifyContent: 'center'
                }}>
                  <PdfContent chunk={chapter} fontSize={fontSize} readMode={readMode} />
                </div>
              </div>
            ) : (
              <div ref={scrollRef}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                style={{ flex:1, overflowY: 'auto', overflowX: 'hidden', padding: 0, scrollBehavior:'smooth', background: (isFullscreen || isMobile) ? th.bg : 'transparent', boxSizing: 'border-box' }}>
                {chapter?.type === 'image' && (
                  <img
                    src={chapter.url}
                    alt={`Page ${curChap + 1}`}
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                  />
                )}
                {chapter?.type === 'pdf' && (
                  <PdfContent chunk={chapter} fontSize={fontSize} />
                )}
                {chapter?.type === 'html' && (
                  <div ref={pageRef}
                    className="page-content"
                    onClick={handleScreenTouch}
                    style={{ width: '100%', maxWidth: 800, margin:'0 auto', background:th.bg, color:th.text, borderRadius: (isFullscreen || isMobile) ? 0 : 4, padding: hPaddingStr, minHeight: '100%', fontFamily:font, fontSize, lineHeight:lineH, wordBreak: 'break-word' }}
                  />
                )}
              </div>
            )}
            {!isFullscreen && isMobile && (
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 16px', background: ac.bg, borderTop: `1px solid ${ac.border}`, flexShrink: 0 }}>
                <Btn style={btnStyle} onClick={() => goChapter(curChap-1)} disabled={curChap<=0}>{t.prev}</Btn>
                <span style={{ fontSize:11, color: ac.textMuted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', margin:'0 10px' }}>{chapter?.title||''}</span>
                <Btn style={btnStyle} onClick={() => goChapter(curChap+1)} disabled={curChap>=chapters.length-1}>{t.next}</Btn>
              </div>
            )}
          </div>
        )}

        {/* WELCOME VIEW */}
        {view === 'welcome' && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, color: ac.textMuted, textAlign:'center', padding:24 }}>
            <div style={{ fontSize:64, opacity:.25 }}>📚</div>
            <h2 style={{ fontSize:18, fontWeight:400, color: ac.text }}>{t.appName}</h2>
            <p style={{ fontSize:13, lineHeight:1.6, maxWidth:300 }}>{t.appDesc}</p>
          </div>
        )}

        {/* Loading overlay */}
        {loading && (
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.6)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, zIndex:99 }}>
            <div style={{ width:32, height:32, border:'3px solid rgba(255,255,255,.1)', borderTopColor: ac.accent, borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
            <span style={{ fontSize:13, color: ac.textMuted }}>{loadMsg}</span>
          </div>
        )}
      </div>

      {/* === MODALS === */}

      {/* Tag Create/Edit Modal */}
      {showTagModal && (() => {
        const TagForm = () => {
          const [tagName, setTagName] = useState(editingTag?.name || '')
          const [tagColor, setTagColor] = useState(editingTag?.color || randomTagColor())
          const handleSave = async () => {
            const name = tagName.trim()
            if (!name) return
            if (editingTag) {
              await updateTag(editingTag.id, { name, color: tagColor })
            } else {
              await createTag(name, tagColor)
            }
            setShowTagModal(false)
            setEditingTag(null)
          }
          return (
            <>
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 3000 }} onClick={() => { setShowTagModal(false); setEditingTag(null); }} />
              <div style={{
                position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                zIndex: 3001, background: ac.el, border: `1px solid ${ac.border}`,
                borderRadius: 12, padding: 24, minWidth: 300, maxWidth: '90vw',
                boxShadow: '0 16px 48px rgba(0,0,0,0.5)'
              }}>
                <h3 style={{ margin: '0 0 16px', color: ac.accent, fontSize: 16 }}>
                  {editingTag ? t.editTag : t.newTag}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, color: ac.textMuted, display: 'block', marginBottom: 4 }}>{t.tagName}</label>
                    <input
                      value={tagName}
                      onChange={e => setTagName(e.target.value)}
                      placeholder={t.tagName}
                      style={{
                        width: '100%', background: ac.bg, border: `1px solid ${ac.border}`,
                        color: ac.text, borderRadius: 6, padding: '8px 12px', fontSize: 14, outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: ac.textMuted, display: 'block', marginBottom: 4 }}>{t.tagColor}</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {TAG_COLORS.map(color => (
                        <div
                          key={color}
                          onClick={() => setTagColor(color)}
                          style={{
                            width: 28, height: 28, borderRadius: '50%', background: color,
                            cursor: 'pointer', border: tagColor === color ? '3px solid white' : '2px solid transparent',
                            transition: 'border 0.15s', boxShadow: tagColor === color ? `0 0 8px ${color}` : 'none'
                          }}
                        />
                      ))}
                      {/* Custom color picker */}
                      <label style={{
                        width: 28, height: 28, borderRadius: '50%',
                        border: '2px dashed rgba(255,255,255,0.35)',
                        cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, color: 'rgba(255,255,255,0.5)',
                        transition: 'border 0.15s'
                      }}
                        onMouseEnter={e => e.currentTarget.style.border = '2px dashed rgba(255,255,255,0.7)'}
                        onMouseLeave={e => e.currentTarget.style.border = '2px dashed rgba(255,255,255,0.35)'}
                        title="Màu tùy chỉnh"
                      >
                        <span style={{ lineHeight: 1 }}>+</span>
                        <input type="color"
                          value={TAG_COLORS.includes(tagColor) ? tagColor : tagColor}
                          onChange={e => setTagColor(e.target.value)}
                          style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                        />
                      </label>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                    <button onClick={() => { setShowTagModal(false); setEditingTag(null); }}
                      style={{ ...btnStyle, padding: '8px 16px', background: 'transparent' }}>
                      {t.cancel}
                    </button>
                    <button onClick={handleSave}
                      style={{ ...btnStyle, padding: '8px 16px', background: ac.accent, color: ac.bg, border: 'none' }}>
                      {t.save}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )
        }
        return <TagForm />
      })()}
3
      {/* Bulk Tag Assign Modal */}
 222     {showBulkTagModal && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 3000 }} onClick={() => setShowBulkTagModal(false)} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            zIndex: 3001, background: ac.el, border: `1px solid ${ac.border}`,
            borderRadius: 12, padding: 24, minWidth: 300, maxWidth: '90vw', maxHeight: '70vh',
            overflowY: 'auto', boxShadow: '0 16px 48px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ margin: '0 0 16px', color: ac.accent, fontSize: 16 }}>{t.assignTag}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {sortedCategories.length === 0 && (
                <div style={{ color: ac.textMuted, fontSize: 13, textAlign: 'center', padding: 16 }}>{t.noTags}</div>
              )}
              {sortedCategories.map(cat => {
                // Check if all selected books have this tag
                const allHave = Array.from(selectedBookIds).every(id => {
                  const book = books.find(b => b.id === id)
                  return book?.categoryIds?.includes(cat.id)
                })
                const someHave = Array.from(selectedBookIds).some(id => {
                  const book = books.find(b => b.id === id)
                  return book?.categoryIds?.includes(cat.id)
                })
                return (
                  <div key={cat.id}
                    onClick={async () => {
                      if (allHave) {
                        // Remove tag from all selected
                        for (const id of selectedBookIds) await assignTagToBook(id, cat.id)
                      } else {
                        // Add tag to all selected
                        await assignTagToBooks(selectedBookIds, cat.id)
                      }
                      setShowBulkTagModal(false)
                      if (selectedBookIds.size === 1 && !isSelectMode) {
                        // Single quick tag assign
                      }
                    }}
                    style={{
                      padding: '10px 14px', cursor: 'pointer', borderRadius: 6, fontSize: 13,
                      background: someHave ? ac.border : ac.bg,
                      color: ac.text, display: 'flex', alignItems: 'center', gap: 10,
                      borderLeft: `3px solid ${cat.color}`
                    }}
                  >
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{cat.pinned ? '📌 ' : ''}{cat.name}</span>
                    {allHave && <span style={{ color: ac.accent, fontSize: 11 }}>✓ Đã gán</span>}
                    {someHave && !allHave && <span style={{ color: ac.textMuted, fontSize: 11 }}>Một phần</span>}
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => setShowBulkTagModal(false)}
                style={{ ...btnStyle, padding: '8px 16px' }}>
                {t.cancel}
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bangers&family=Fira+Code&family=Inter&family=JetBrains+Mono&family=Merriweather&family=Montserrat&family=Noto+Sans+SC&family=Noto+Sans+TC&family=Noto+Serif+SC&family=Noto+Serif+TC&family=Open+Sans&family=Patrick+Hand&family=Playfair+Display&family=Roboto&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-thumb { background: ${ac.border}; border-radius: 3px; }
        .page-content {
          text-align: justify !important;
        }
        .page-content p {
          text-indent: 0.75em !important;
          margin-bottom: 0.5em !important;
          text-align: justify !important;
        }
        .page-content * {
          max-width: 100% !important;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
        }
        .page-content img, .page-content canvas {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .menu-btn-bg {
          background: transparent;
        }
        button:active .menu-btn-bg {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>

  )
}
