import { useState } from 'react'
import { getDropStyle } from '../themes.js'

export const Btn = ({ children, onClick, disabled, style }) => (
  <button onClick={onClick} disabled={disabled} style={{ ...style, opacity: disabled ? .25 : 1 }}>{children}</button>
)

export const Dropdown = ({ value, onChange, options, ac, btnStyle }) => {
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
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 2, ...getDropStyle(ac).container, maxHeight: 200, overflowY: 'auto', marginTop: 4 }}>
            {options.map(o => (
              <div
                key={o.value}
                onClick={() => { onChange(o.value); setOpen(false); }}
                style={{ ...getDropStyle(ac).item, ...(value === o.value ? getDropStyle(ac).itemSelected : getDropStyle(ac).itemNormal) }}
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
