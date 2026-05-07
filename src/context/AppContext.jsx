import { createContext, useContext, useState, useEffect, useRef } from 'react'
import TRANSLATIONS from '../translations.js'
import { dbGet, dbGetAll, dbPut } from '../db.js'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  // --- Books & Reading ---
  const [books, setBooks]             = useState([])
  const [currentBook, setCurrentBook] = useState(null)
  const [chapters, setChapters]       = useState([])
  const [curChap, setCurChap]         = useState(0)
  const [progressMap, setProgressMap] = useState({})

  // --- UI State ---
  const [view, setView]               = useState('welcome')
  const [loading, setLoading]         = useState(false)
  const [loadMsg, setLoadMsg]         = useState('')
  const [isMenuOpen, setIsMenuOpen]   = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  // --- Reader Settings ---
  const [theme, setTheme]             = useState('sepia')
  const [font, setFont]               = useState('Arial,sans-serif')
  const [fontSize, setFontSize]       = useState(18)
  const [lineH, setLineH]             = useState(1.85)
  const [readMode, setReadMode]       = useState('vertical')
  const [tapConfig, setTapConfig]     = useState(2)

  // --- App Settings ---
  const [lang, setLang]               = useState('vi')
  const [appTheme, setAppTheme]       = useState('warmCream')
  const [showSidebar, setShowSidebar] = useState(true)

  // --- Categories & Tags ---
  const [categories, setCategories]   = useState([])
  const [selectedCategoryId, setSelectedCategoryId] = useState('all')
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [selectedBookIds, setSelectedBookIds] = useState(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [showTagModal, setShowTagModal] = useState(false)
  const [editingTag, setEditingTag]   = useState(null)
  const [showBulkTagModal, setShowBulkTagModal] = useState(false)
  const [showStats, setShowStats]     = useState(false)
  const [tagContextMenu, setTagContextMenu] = useState(null)

  // --- Reader UI ---
  const [showChapterGrid, setShowChapterGrid] = useState(false)
  const [showThemeDropdown, setShowThemeDropdown] = useState(false)
  const [showReadThemeDropdown, setShowReadThemeDropdown] = useState(false)
  const [chapInput, setChapInput]     = useState('')

  // --- Touch ---
  const [touchStartX, setTouchStartX] = useState(null)
  const [touchStartY, setTouchStartY] = useState(null)

  // --- Refs ---
  const scrollRef = useRef(null)
  const pageRef   = useRef(null)
  const chapterListRef = useRef(null)
  const clickTimeoutRef = useRef(null)
  const longPressRef = useRef(null)
  const fileInputRef = useRef(null)

  const isFullscreenRef = useRef(isFullscreen)
  const viewRef = useRef(view)
  const isMenuOpenRef = useRef(isMenuOpen)

  const t = TRANSLATIONS[lang]

  // --- Sync refs ---
  useEffect(() => { isFullscreenRef.current = isFullscreen }, [isFullscreen])
  useEffect(() => { viewRef.current = view }, [view])
  useEffect(() => { isMenuOpenRef.current = isMenuOpen }, [isMenuOpen])

  // --- Back button handler ---
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

  // --- Load settings from DB ---
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
        // appTheme mặc định giờ là warmCream, không load từ DB nữa
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

  // --- Save settings to DB ---
  useEffect(() => {
    if (!settingsLoaded) return
    dbPut('settings', { key: 'ui', theme, font, fontSize, lineH, lang, tapConfig, appTheme, readMode })
  }, [theme, font, fontSize, lineH, lang, tapConfig, appTheme, readMode, settingsLoaded])

  const value = {
    books, setBooks,
    currentBook, setCurrentBook,
    chapters, setChapters,
    curChap, setCurChap,
    progressMap, setProgressMap,
    view, setView,
    loading, setLoading,
    loadMsg, setLoadMsg,
    isMenuOpen, setIsMenuOpen,
    isFullscreen, setIsFullscreen,
    settingsLoaded, setSettingsLoaded,
    theme, setTheme,
    font, setFont,
    fontSize, setFontSize,
    lineH, setLineH,
    readMode, setReadMode,
    tapConfig, setTapConfig,
    lang, setLang,
    appTheme, setAppTheme,
    showSidebar, setShowSidebar,
    categories, setCategories,
    selectedCategoryId, setSelectedCategoryId,
    isSelectMode, setIsSelectMode,
    selectedBookIds, setSelectedBookIds,
    searchQuery, setSearchQuery,
    showTagModal, setShowTagModal,
    editingTag, setEditingTag,
    showBulkTagModal, setShowBulkTagModal,
    showStats, setShowStats,
    tagContextMenu, setTagContextMenu,
    showChapterGrid, setShowChapterGrid,
    showThemeDropdown, setShowThemeDropdown,
    showReadThemeDropdown, setShowReadThemeDropdown,
    chapInput, setChapInput,
    touchStartX, setTouchStartX,
    touchStartY, setTouchStartY,
    scrollRef, pageRef, chapterListRef,
    clickTimeoutRef, longPressRef, fileInputRef,
    isFullscreenRef, viewRef, isMenuOpenRef,
    t
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used within AppProvider')
  return ctx
}

export default AppContext
