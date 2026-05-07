# 📚 Đọc Sách Nè (Doc Sach)

A full-featured offline book reader for Android, built with React 19 + Capacitor 8. Supports EPUB, PDF, ZIP/CBZ, and TXT formats with a rich reading experience, 4-language i18n, 51 app themes, and a tag-based library management system.

---

## 🏗️ Architecture

```
src/
├── context/
│   └── AppContext.jsx            ← State management (React Context API)
├── App.jsx                       ← Root component, parsers, handlers
├── main.jsx                      ← Entry point, AppProvider wrapper
├── themes.js                     ← 51 app themes + 8 reader themes
├── translations.js               ← 4-language i18n (vi, en, zh_cn, zh_tw)
├── db.js                         ← IndexedDB operations
└── __tests__/                    ← Vitest unit tests
    ├── db.test.js
    ├── themes.test.js
    └── translations.test.js
```

## 🔄 Data Flow

```
 User Action
     │
     ▼
 App.jsx handler ────► Context state update ────► Components re-render
     │                        │
     │                        ▼
     │                   db.js → IndexedDB (persist)
     │
     ▼
 Parser functions ───► ArrayBuffer → parsed chapters → stored in IndexedDB
 (parseEpub, parsePdf,
  parseZip, parseTxt)
```

### State Management

All app state is managed via **React Context** (`src/context/AppContext.jsx`). The `AppProvider` wraps the entire application and holds 27+ state values organized into:

| Group | States |
|-------|--------|
| Books & Reading | `books`, `currentBook`, `chapters`, `curChap`, `progressMap` |
| UI State | `view`, `loading`, `loadMsg`, `isMenuOpen`, `isFullscreen`, `settingsLoaded` |
| Reader Settings | `theme`, `font`, `fontSize`, `lineH`, `readMode`, `tapConfig` |
| App Settings | `lang`, `appTheme`, `showSidebar` |
| Categories & Tags | `categories`, `selectedCategoryId`, `isSelectMode`, `selectedBookIds`, `searchQuery`, tag modals |
| Touch | `touchStartX`, `touchStartY` |

Three `useEffect` hooks run in the provider:
1. **Back button handler** — intercepts Android back button with proper navigation stack
2. **Settings loader** — loads saved preferences from IndexedDB on startup
3. **Settings saver** — persists preferences to IndexedDB on change

## 📱 Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2 | UI framework |
| Vite | 8.0 | Build tool |
| Capacitor | 8.3 | Native Android wrapper |
| pdfjs-dist | 5.7 | PDF rendering |
| JSZip | 3.10 | EPUB/ZIP parsing |
| react-zoom-pan-pinch | 4.0 | Pinch-to-zoom |
| Vitest | 4.1 | Unit testing |
| fake-indexeddb | 6.x | IndexedDB mock for tests |

### Capacitor Plugins

| Plugin | Purpose |
|--------|---------|
| `@capacitor-community/keep-awake` | Prevent screen timeout while reading |
| `@capacitor/app` | Back button handling + exit |
| `@capacitor/status-bar` | Fullscreen mode status bar toggle |

## 🌐 i18n System

4 languages with identical key structure:
- 🇻🇳 Tiếng Việt (`vi`)
- 🇬🇧 English (`en`)
- 🇨🇳 中文简体 (`zh_cn`)
- 🇹🇼 中文繁體 (`zh_tw`)

Language detection and key validation are tested automatically.

## 🎨 Theme System

### 51 App Themes
From dark (`navy`, `midnight`, `black`) to gradient (`sunnyDay`, `coralSunset`, `neonPurple`) to light (`warmCream` — default).

### 8 Reader Themes
`sepia`, `white`, `ylight`, `ydark`, `green`, `dark`, `night`, `eyecare`

### Dynamic Dropdown Styling
`getDropStyle(ac)` automatically renders appropriate light/dark dropdowns based on the active theme's background color.

## 📖 Supported Formats

| Format | Coverage | Parser |
|--------|----------|--------|
| EPUB | Full support + metadata extraction + auto-genre detection | `parseEpub()` via JSZip |
| PDF | Full support, page-by-page rendering | `parsePdf()` via pdfjs-dist |
| ZIP/CBZ | Full support, sorted image extraction | `parseZip()` via JSZip |
| TXT | Full support | `parseTxt()` |

All formats support:
- Cover extraction
- Progress saving (remembers chapter/page)
- 20+ font choices + font size + line height
- Vertical scroll / horizontal pagination

## 🧪 Testing

```bash
npm test          # Run all tests
npm run test:watch  # Watch mode
```

31 tests across 3 test files:
- `db.test.js` — IndexedDB CRUD operations (6 tests)
- `themes.test.js` — Theme structure, getDropStyle logic, TAG_COLORS (12 tests)
- `translations.test.js` — Key consistency across 4 languages (13 tests)

## 🚀 Build & Deploy

```bash
npm install        # Install dependencies
npm run build      # Build with Vite
npx cap sync       # Sync web assets to Android
npx cap open android  # Open in Android Studio
```

Build output: **~270ms**, 33 modules, 0 errors.

### CI/CD

GitHub Actions (`.github/workflows/build-apk.yml`) runs on every push to `main`:
1. Install dependencies
2. Run tests (`npm test`)
3. Build web assets (`npm run build`)
4. Build Android APK via Gradle
5. Upload APK as artifact

## 📂 Project Structure

```
doc-sach/
├── src/
│   ├── context/
│   │   └── AppContext.jsx
│   ├── __tests__/
│   │   ├── db.test.js
│   │   ├── themes.test.js
│   │   └── translations.test.js
│   ├── App.jsx
│   ├── App.css
│   ├── main.jsx
│   ├── themes.js
│   ├── translations.js
│   ├── db.js
│   └── index.css
├── android/                 # Capacitor Android project
├── .github/
│   └── workflows/
│       └── build-apk.yml
├── package.json
├── vite.config.js
├── vitest.config.js
└── capacitor.config.json
```

---

Built by Nguyen Duy for Taiwan CS university application portfolio.
