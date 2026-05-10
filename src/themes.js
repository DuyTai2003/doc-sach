export const THEMES = {
  sepia:  { bg: '#fdf6e3', text: '#3c3836' },
  white:  { bg: '#ffffff', text: '#111111' },
  ylight: { bg: '#fffacd', text: '#3a3010' },
  ydark:  { bg: '#daa520', text: '#1a0f00' },
  green:  { bg: '#e8f0e0', text: '#2a3820' },
  dark:   { bg: '#242422', text: '#c8c4bc' },
  night:  { bg: '#0d0d0d', text: '#808080' },
  eyecare: { bg: '#f4ecd8', text: '#332d22' }
}

export const FONTS = [
  { label: 'Georgia',        value: 'Georgia,serif' },
  { label: 'Times New Roman',value: "'Times New Roman',serif" },
  { label: 'Merriweather',   value: "'Merriweather',serif" },
  { label: 'Playfair Display',value: "'Playfair Display',serif" },
  { label: 'Noto Serif SC',  value: "'Noto Serif SC',serif" },
  { label: 'Noto Serif TC',  value: "'Noto Serif TC',serif" },
  { label: 'Arial',          value: 'Arial,sans-serif' },
  { label: 'Roboto',         value: "'Roboto',sans-serif" },
  { label: 'Open Sans',      value: "'Open Sans',sans-serif" },
  { label: 'Montserrat',     value: "'Montserrat',sans-serif" },
  { label: 'Inter',          value: "'Inter',sans-serif" },
  { label: 'Noto Sans SC',   value: "'Noto Sans SC',sans-serif" },
  { label: 'Noto Sans TC',   value: "'Noto Sans TC',sans-serif" },
  { label: 'Microsoft YaHei',value: "'Microsoft YaHei',sans-serif" },
  { label: 'Verdana',        value: 'Verdana,sans-serif' },
  { label: 'Segoe UI',       value: "'Segoe UI',sans-serif" },
  { label: 'Patrick Hand',   value: "'Patrick Hand',cursive" },
  { label: 'Bangers',        value: "'Bangers',cursive" },
  { label: 'Comic Sans MS',  value: "'Comic Sans MS',cursive,sans-serif" },
  { label: 'Fira Code',      value: "'Fira Code',monospace" },
  { label: 'JetBrains Mono', value: "'JetBrains Mono',monospace" },
]

export const APP_THEMES = {
  navy:   { bg: '#0f172a', el: '#1e293b', border: '#334155', text: '#f8fafc', textMuted: '#cbd5e1', accent: '#fbbf24' },
  dark:   { bg: '#121212', el: '#1e1e1e', border: '#333333', text: '#eeeeee', textMuted: '#aaaaaa', accent: '#e8c97e' },
  black:  { bg: '#000000', el: '#111111', border: '#222222', text: '#ffffff', textMuted: '#bbbbbb', accent: '#ffffff' },
  brown:  { bg: '#3e2723', el: '#4e342e', border: '#5d4037', text: '#efebe9', textMuted: '#d7ccc8', accent: '#ffb300' },
  green:  { bg: '#1b5e20', el: '#2e7d32', border: '#388e3c', text: '#e8f5e9', textMuted: '#c8e6c9', accent: '#69f0ae' },
  purple:  { bg: '#311b92', el: '#4527a0', border: '#512da8', text: '#ede7f6', textMuted: '#d1c4e9', accent: '#b388ff' },
  pink:    { bg: '#500724', el: '#831843', border: '#9d174d', text: '#fdf2f8', textMuted: '#fbcfe8', accent: '#f43f5e' },
  rose:    { bg: '#4c0519', el: '#881337', border: '#9f1239', text: '#fff1f2', textMuted: '#fecdd3', accent: '#fb7185' },
  crimson: { bg: '#450a0a', el: '#7f1d1d', border: '#991b1b', text: '#fef2f2', textMuted: '#fecaca', accent: '#f87171' },
  orange:  { bg: '#431407', el: '#7c2d12', border: '#9a3412', text: '#fff7ed', textMuted: '#fed7aa', accent: '#fb923c' },
  amber:   { bg: '#451a03', el: '#78350f', border: '#92400e', text: '#fffbeb', textMuted: '#fde68a', accent: '#fbbf24' },
  teal:    { bg: '#042f2e', el: '#115e59', border: '#134e4a', text: '#f0fdfa', textMuted: '#ccfbf1', accent: '#2dd4bf' },
  cyan:    { bg: '#083344', el: '#164e63', border: '#155e75', text: '#ecfeff', textMuted: '#cffafe', accent: '#22d3ee' },
  ocean:   { bg: '#0c4a6e', el: '#155e75', border: '#0e7490', text: '#ecfeff', textMuted: '#cffafe', accent: '#38bdf8' },
  indigo:  { bg: '#1e1b4b', el: '#312e81', border: '#3730a3', text: '#eef2ff', textMuted: '#e0e7ff', accent: '#818cf8' },
  midnight:{ bg: '#020617', el: '#0f172a', border: '#1e293b', text: '#f8fafc', textMuted: '#cbd5e1', accent: '#60a5fa' },
  zinc:    { bg: '#18181b', el: '#27272a', border: '#3f3f46', text: '#fafafa', textMuted: '#e4e4e7', accent: '#a1a1aa' },
  stone:   { bg: '#1c1917', el: '#292524', border: '#44403c', text: '#fafaf9', textMuted: '#e7e5e4', accent: '#a8a29e' },
  coffee:  { bg: '#271c19', el: '#3e2c25', border: '#573e33', text: '#f5ebe7', textMuted: '#dfcfc8', accent: '#d4a373' },
  forest:  { bg: '#052e16', el: '#14532d', border: '#166534', text: '#f0fdf4', textMuted: '#dcfce7', accent: '#4ade80' },
  sunnyDay: { bg: 'linear-gradient(135deg, #FDEB71, #F8D800)', el: 'rgba(0,0,0,0.3)', border: 'rgba(255,255,255,0.3)', text: '#ffffff', textMuted: 'rgba(255,255,255,0.7)', accent: '#ffffff' },
  skyBlue: { bg: 'linear-gradient(135deg, #ABDCFF, #0396FF)', el: 'rgba(0,0,0,0.3)', border: 'rgba(255,255,255,0.3)', text: '#ffffff', textMuted: 'rgba(255,255,255,0.7)', accent: '#ffffff' },
  coralSunset: { bg: 'linear-gradient(135deg, #FEB692, #EA5455)', el: 'rgba(0,0,0,0.3)', border: 'rgba(255,255,255,0.3)', text: '#ffffff', textMuted: 'rgba(255,255,255,0.7)', accent: '#ffffff' },
  lavenderDream: { bg: 'linear-gradient(135deg, #CE9FFC, #7367F0)', el: 'rgba(0,0,0,0.3)', border: 'rgba(255,255,255,0.3)', text: '#ffffff', textMuted: 'rgba(255,255,255,0.7)', accent: '#ffffff' },
  aquaMarine: { bg: 'linear-gradient(135deg, #90F7EC, #32CCBC)', el: 'rgba(0,0,0,0.3)', border: 'rgba(255,255,255,0.3)', text: '#ffffff', textMuted: 'rgba(255,255,255,0.7)', accent: '#ffffff' },
  peachSorbet: { bg: 'linear-gradient(135deg, #FFF6B7, #F6416C)', el: 'rgba(0,0,0,0.3)', border: 'rgba(255,255,255,0.3)', text: '#ffffff', textMuted: 'rgba(255,255,255,0.7)', accent: '#ffffff' },
  freshMint: { bg: 'linear-gradient(135deg, #81FBB8, #28C76F)', el: 'rgba(0,0,0,0.3)', border: 'rgba(255,255,255,0.3)', text: '#ffffff', textMuted: 'rgba(255,255,255,0.7)', accent: '#ffffff' },
  purpleMist: { bg: 'linear-gradient(135deg, #E2B0FF, #9F44D3)', el: 'rgba(0,0,0,0.3)', border: 'rgba(255,255,255,0.3)', text: '#ffffff', textMuted: 'rgba(255,255,255,0.7)', accent: '#ffffff' },
  deepRose: { bg: 'linear-gradient(135deg, #F97794, #623AA2)', el: 'rgba(0,0,0,0.3)', border: 'rgba(255,255,255,0.3)', text: '#ffffff', textMuted: 'rgba(255,255,255,0.7)', accent: '#ffffff' },
  warmAmber: { bg: 'linear-gradient(135deg, #FCCF31, #F55555)', el: 'rgba(0,0,0,0.3)', border: 'rgba(255,255,255,0.3)', text: '#ffffff', textMuted: 'rgba(255,255,255,0.7)', accent: '#ffffff' },
  candyPink: { bg: 'linear-gradient(135deg, #F761A1, #8C1BAB)', el: 'rgba(0,0,0,0.3)', border: 'rgba(255,255,255,0.3)', text: '#ffffff', textMuted: 'rgba(255,255,255,0.7)', accent: '#ffffff' },
  neonPurple: { bg: 'linear-gradient(135deg, #43CBFF, #9708CC)', el: 'rgba(0,0,0,0.3)', border: 'rgba(255,255,255,0.3)', text: '#ffffff', textMuted: 'rgba(255,255,255,0.7)', accent: '#ffffff' },
  electricBlue: { bg: 'linear-gradient(135deg, #5EFCE8, #736EFE)', el: 'rgba(0,0,0,0.3)', border: 'rgba(255,255,255,0.3)', text: '#ffffff', textMuted: 'rgba(255,255,255,0.7)', accent: '#ffffff' },
  softApricot: { bg: 'linear-gradient(135deg, #FAD7A1, #E96D71)', el: 'rgba(0,0,0,0.3)', border: 'rgba(255,255,255,0.3)', text: '#ffffff', textMuted: 'rgba(255,255,255,0.7)', accent: '#ffffff' },
  goldenHour: { bg: 'linear-gradient(135deg, #FFD26F, #3677FF)', el: 'rgba(0,0,0,0.3)', border: 'rgba(255,255,255,0.3)', text: '#ffffff', textMuted: 'rgba(255,255,255,0.7)', accent: '#ffffff' },
  acidLime: { bg: 'linear-gradient(135deg, #A0FE65, #FA016D)', el: 'rgba(0,0,0,0.3)', border: 'rgba(255,255,255,0.3)', text: '#ffffff', textMuted: 'rgba(255,255,255,0.7)', accent: '#ffffff' },
  midnightGold: { bg: 'linear-gradient(135deg, #FFDB01, #0E197D)', el: 'rgba(0,0,0,0.3)', border: 'rgba(255,255,255,0.3)', text: '#ffffff', textMuted: 'rgba(255,255,255,0.7)', accent: '#ffffff' },
  burntOrange: { bg: 'linear-gradient(135deg, #FEC163, #DE4313)', el: 'rgba(0,0,0,0.3)', border: 'rgba(255,255,255,0.3)', text: '#ffffff', textMuted: 'rgba(255,255,255,0.7)', accent: '#ffffff' },
  oceanDeep: { bg: 'linear-gradient(135deg, #92FFC0, #002661)', el: 'rgba(0,0,0,0.3)', border: 'rgba(255,255,255,0.3)', text: '#ffffff', textMuted: 'rgba(255,255,255,0.7)', accent: '#ffffff' },
  sunsetViolet: { bg: 'linear-gradient(135deg, #EEAD92, #6018DC)', el: 'rgba(0,0,0,0.3)', border: 'rgba(255,255,255,0.3)', text: '#ffffff', textMuted: 'rgba(255,255,255,0.7)', accent: '#ffffff' },
  darkMaroon: { bg: 'linear-gradient(135deg, #F05F57, #360940)', el: 'rgba(0,0,0,0.3)', border: 'rgba(255,255,255,0.3)', text: '#ffffff', textMuted: 'rgba(255,255,255,0.7)', accent: '#ffffff' },
  cottonCandy: { bg: 'linear-gradient(135deg, #F6CEEC, #D939CD)', el: 'rgba(0,0,0,0.3)', border: 'rgba(255,255,255,0.3)', text: '#ffffff', textMuted: 'rgba(255,255,255,0.7)', accent: '#ffffff' },
  deepSea: { bg: 'linear-gradient(135deg, #52E5E7, #130CB7)', el: 'rgba(0,0,0,0.3)', border: 'rgba(255,255,255,0.3)', text: '#ffffff', textMuted: 'rgba(255,255,255,0.7)', accent: '#ffffff' },
  royalPlum: { bg: 'linear-gradient(135deg, #F1CA74, #A64DB6)', el: 'rgba(0,0,0,0.3)', border: 'rgba(255,255,255,0.3)', text: '#ffffff', textMuted: 'rgba(255,255,255,0.7)', accent: '#ffffff' },
  twilightGold: { bg: 'linear-gradient(135deg, #E8D07A, #5312D6)', el: 'rgba(0,0,0,0.3)', border: 'rgba(255,255,255,0.3)', text: '#ffffff', textMuted: 'rgba(255,255,255,0.7)', accent: '#ffffff' },
  electricViolet: { bg: 'linear-gradient(135deg, #EECE13, #B210FF)', el: 'rgba(0,0,0,0.3)', border: 'rgba(255,255,255,0.3)', text: '#ffffff', textMuted: 'rgba(255,255,255,0.7)', accent: '#ffffff' },
  lagoonBlue: { bg: 'linear-gradient(135deg, #79F1A4, #0E5CAD)', el: 'rgba(0,0,0,0.3)', border: 'rgba(255,255,255,0.3)', text: '#ffffff', textMuted: 'rgba(255,255,255,0.7)', accent: '#ffffff' },
  fireEnergy: { bg: 'linear-gradient(135deg, #FDD819, #E80505)', el: 'rgba(0,0,0,0.3)', border: 'rgba(255,255,255,0.3)', text: '#ffffff', textMuted: 'rgba(255,255,255,0.7)', accent: '#ffffff' },
  paleRose: { bg: 'linear-gradient(135deg, #FFF3B0, #CA26FF)', el: 'rgba(0,0,0,0.3)', border: 'rgba(255,255,255,0.3)', text: '#ffffff', textMuted: 'rgba(255,255,255,0.7)', accent: '#ffffff' },
  mysticPurple: { bg: 'linear-gradient(135deg, #FFF5C3, #9452A5)', el: 'rgba(0,0,0,0.3)', border: 'rgba(255,255,255,0.3)', text: '#ffffff', textMuted: 'rgba(255,255,255,0.7)', accent: '#ffffff' },
  // Warm cream light theme
  warmCream: { bg: '#F5EDE0', el: '#EDE0CE', border: '#DDCCB0', text: '#2C1F14', textMuted: '#7A6B5C', accent: '#C6853A' }
}

// getDropStyle returns theme-appropriate dropdown styling
export function getDropStyle(ac) {
  const isDark = ac.bg !== '#F5EDE0' && !ac.bg.includes('linear-gradient')
  return {
    container: {
      background: isDark ? '#1c1c28' : '#ffffff',
      border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #E0DDD5',
      borderRadius: 6,
      boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.65)' : '0 8px 32px rgba(0,0,0,0.12)'
    },
    item: { padding: '8px 10px', cursor: 'pointer', fontSize: 12 },
    itemNormal: { background: isDark ? '#1c1c28' : '#ffffff', color: isDark ? '#d0d0d0' : '#1C1917' },
    itemSelected: { background: isDark ? 'rgba(255,255,255,0.1)' : '#F0EBE3', color: isDark ? '#f0f0f0' : '#1C1917', fontWeight: 'bold' }
  }
}

// Default dropdown style (dark theme)
export const DROP_STYLE = {
  container: {
    background: '#1c1c28',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 6,
    boxShadow: '0 8px 32px rgba(0,0,0,0.65)'
  },
  item: { padding: '8px 10px', cursor: 'pointer', fontSize: 12 },
  itemNormal: { background: '#1c1c28', color: '#d0d0d0' },
  itemSelected: { background: 'rgba(255,255,255,0.1)', color: '#f0f0f0', fontWeight: 'bold' }
}

export const TAG_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#6b7280'
]

export function randomTagColor() {
  return TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]
}
