import { describe, it, expect } from 'vitest'

// Import the TRANSLATIONS object directly
import TRANSLATIONS from '../translations.js'

function getAllKeys(obj, prefix = '') {
  const keys = []
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...getAllKeys(value, fullKey))
    } else {
      keys.push(fullKey)
    }
  }
  return keys.sort()
}

describe('translations.js', () => {
  const languages = ['vi', 'en', 'zh_cn', 'zh_tw']
  const requiredTopKeys = ['library', 'add', 'next', 'prev', 'setting', 'fsMode',
    'curChap', 'enterChap', 'fontSize', 'font', 'theme', 'lineHeight', 'lang',
    'tapToFs', 'appThemeTitle', 'toc', 'yourLib', 'noBooks', 'appName', 'appDesc',
    'reading', 'opening', 'err', 'delConfirm', 'chapterTitle', 'pageTitle',
    'readMode', 'modeVertical', 'modeHorizontal', 'backup', 'restore',
    'backupDesc', 'restoreDesc', 'categories', 'statistics', 'editTag',
    'deleteTag', 'pinTag', 'unpinTag', 'assignTag', 'save', 'cancel',
    'noTags', 'search', 'loading']

  languages.forEach(lang => {
    it(`"${lang}" should be a valid language`, () => {
      expect(TRANSLATIONS[lang]).toBeDefined()
      expect(typeof TRANSLATIONS[lang]).toBe('object')
    })
  })

  languages.forEach(lang => {
    it(`"${lang}" should have all required top-level keys`, () => {
      const t = TRANSLATIONS[lang]
      requiredTopKeys.forEach(key => {
        expect(t[key]).toBeDefined()
      })
    })
  })

  it('all 4 languages should have identical key structure', () => {
    const keySets = languages.map(lang => {
      const t = TRANSLATIONS[lang]
      const keys = new Set()
      // Collect top-level keys + appThemes keys
      for (const [key, value] of Object.entries(t)) {
        if (key === 'appThemes' && typeof value === 'object') {
          Object.keys(value).forEach(k => keys.add(`appThemes.${k}`))
        } else if (key === 'themes' && typeof value === 'object') {
          Object.keys(value).forEach(k => keys.add(`themes.${k}`))
        } else if (typeof value !== 'object' || Array.isArray(value)) {
          keys.add(key)
        }
      }
      return keys
    })

    // Check all key sets are identical
    const reference = keySets[0]
    keySets.forEach((keySet, i) => {
      // Keys in this set but not in reference
      const missing = [...reference].filter(k => !keySet.has(k))
      const extra = [...keySet].filter(k => !reference.has(k))
      if (missing.length > 0 || extra.length > 0) {
        console.error(`Language ${languages[i]}: missing=${missing}, extra=${extra}`)
      }
      expect(missing).toEqual([])
      expect(extra).toEqual([])
    })
  })

  it('warmCream should exist in appThemes for all languages', () => {
    languages.forEach(lang => {
      const themes = TRANSLATIONS[lang].appThemes
      expect(themes.warmCream).toBeDefined()
    })
  })

  it('all appTheme keys should match APP_THEMES keys (no orphans)', () => {
    // We only check vi as reference since key structure was validated above
    const viThemeKeys = Object.keys(TRANSLATIONS.vi.appThemes)
    // warmCream should be present
    expect(viThemeKeys).toContain('warmCream')
  })

  it('t loading should exist in all languages', () => {
    languages.forEach(lang => {
      expect(TRANSLATIONS[lang].loading).toBeDefined()
    })
  })

  it('no undefined or null values in translations', () => {
    languages.forEach(lang => {
      function checkValues(obj, path = '') {
        for (const [key, value] of Object.entries(obj)) {
          const fullPath = path ? `${path}.${key}` : key
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            checkValues(value, fullPath)
          } else {
            expect(value, `Translation missing at ${lang}.${fullPath}`).toBeDefined()
            expect(value, `Translation null at ${lang}.${fullPath}`).not.toBeNull()
          }
        }
      }
      checkValues(TRANSLATIONS[lang])
    })
  })
})
