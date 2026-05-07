import { describe, it, expect } from 'vitest'
import { getDropStyle, APP_THEMES, TAG_COLORS, randomTagColor, THEMES, FONTS } from '../themes.js'

describe('themes.js - APP_THEMES', () => {
  it('should have warmCream as a theme', () => {
    expect(APP_THEMES.warmCream).toBeDefined()
    expect(APP_THEMES.warmCream.bg).toBe('#F5EDE0')
    expect(APP_THEMES.warmCream.accent).toBe('#C6853A')
  })

  it('should have all required color keys per theme', () => {
    const requiredKeys = ['bg', 'el', 'border', 'text', 'textMuted', 'accent']
    Object.entries(APP_THEMES).forEach(([name, theme]) => {
      requiredKeys.forEach(key => {
        expect(theme[key]).toBeDefined()
      })
    })
  })

  it('should have at least 40 themes', () => {
    expect(Object.keys(APP_THEMES).length).toBeGreaterThanOrEqual(40)
  })
})

describe('themes.js - getDropStyle', () => {
  it('should return light styles for warmCream theme', () => {
    const style = getDropStyle(APP_THEMES.warmCream)
    expect(style.container.background).toBe('#ffffff')
    expect(style.itemNormal.color).toBe('#1C1917')
    expect(style.itemSelected.background).toBe('#F0EBE3')
  })

  it('should return dark styles for navy theme', () => {
    const style = getDropStyle(APP_THEMES.navy)
    expect(style.container.background).toBe('#1c1c28')
    expect(style.itemNormal.color).toBe('#d0d0d0')
    expect(style.itemSelected.background).toBe('rgba(255,255,255,0.1)')
  })

  it('should return light styles for gradient themes (linear-gradient bg treated as light)', () => {
    const style = getDropStyle(APP_THEMES.sunnyDay)
    expect(style.container.background).toBe('#ffffff')
  })
})

describe('themes.js - THEMES & FONTS', () => {
  it('should have 8 reader themes', () => {
    expect(Object.keys(THEMES).length).toBe(8)
  })

  it('should have 20+ fonts', () => {
    expect(FONTS.length).toBeGreaterThanOrEqual(20)
  })

  it('each font should have label and value', () => {
    FONTS.forEach(f => {
      expect(f.label).toBeDefined()
      expect(f.value).toBeDefined()
    })
  })
})

describe('themes.js - TAG_COLORS', () => {
  it('should have 18 colors', () => {
    expect(TAG_COLORS.length).toBe(18)
  })

  it('all colors should be valid hex', () => {
    TAG_COLORS.forEach(c => {
      expect(c).toMatch(/^#[0-9a-fA-F]{6}$/)
    })
  })

  it('randomTagColor should return a valid color', () => {
    const color = randomTagColor()
    expect(TAG_COLORS).toContain(color)
  })
})
