import { useState } from 'react'
import HelpModal from '../HelpModal'

const HELP_STEPS = [
  'เลือกประเภทหวยและวันที่งวดด้านบน',
  'กรอกเลขในช่อง "เลข" ได้ทั้ง 2 ตัวหรือ 3 ตัว — หรือวางเลขหลายตัวพร้อมกัน เช่น "12 22 36" แล้วระบบจะแตกแถวให้อัตโนมัติ',
  'กรอกราคาบน / ล่าง-โต๊ด ต่อแถว — หรือกรอกแถว "ตั้งราคาทุกเลข" แล้วกด "ตั้งราคา" เพื่อตั้งพร้อมกันทุกแถว',
  'กด "✓ บันทึกลง list" เพื่อเพิ่มชุดนี้ลงรายการ — สามารถสร้างได้หลายชุด',
  'กด chip เลขใดเลขหนึ่งใน list เพื่อลบออก หรือ "ยกเลิกทั้งชุด" เพื่อยกเลิกทั้งกลุ่ม',
  'กด "📋 Copy ทั้งหมด" เพื่อคัดลอก หรือ "💾 บันทึกลงประวัติการซื้อ" เพื่อบันทึกในระบบ',
]

const DRAW_TYPES = [
  { value: 'thai_gov', label: 'หวยรัฐบาล' },
  { value: 'hanoi', label: 'หวยฮานอย' },
  { value: 'lao', label: 'หวยลาว' },
]

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function drawLabel(type) {
  return DRAW_TYPES.find(d => d.value === type)?.label || type
}

let _uid = 1
function newRow() {
  return { id: _uid++, number: '', priceTop: '', priceBottom: '' }
}

export default function CreateBill({ apiBase, onError }) {
  const [showHelp, setShowHelp] = useState(false)
  const [drawType, setDrawType] = useState('thai_gov')
  const [drawDate, setDrawDate] = useState(todayStr())
  const [rows, setRows] = useState([newRow()])
  const [bulkTop, setBulkTop] = useState('')
  const [bulkBottom, setBulkBottom] = useState('')
  const [groups, setGroups] = useState([])
  const [saving, setSaving] = useState(false)
  const [copyDone, setCopyDone] = useState(false)
  const [saveDone, setSaveDone] = useState(false)

  const applyBulk = () => {
    if (bulkTop === '' && bulkBottom === '') return
    setGroups(prev => prev.map(g => ({
      ...g,
      items: g.items.map(item => ({
        ...item,
        ...(bulkTop !== '' ? { priceTop: bulkTop } : {}),
        ...(bulkBottom !== '' ? { priceBottom: bulkBottom } : {}),
      })),
    })))
  }

  const handleNumberChange = (rowId, value) => {
    if (/[\s,\n]/.test(value.trim())) {
      const nums = value.split(/[\s,\n]+/).map(s => s.replace(/\D/g, '')).filter(n => n.length >= 2 && n.length <= 3)
      if (nums.length > 1) {
        const currentRow = rows.find(r => r.id === rowId)
        const insertRows = nums.map(n => ({
          id: _uid++,
          number: n,
          priceTop: currentRow?.priceTop || '',
          priceBottom: currentRow?.priceBottom || '',
        }))
        setRows(prev => {
          const idx = prev.findIndex(r => r.id === rowId)
          return [...prev.slice(0, idx), ...insertRows, ...prev.slice(idx + 1)]
        })
        return
      }
    }
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, number: value.replace(/\D/g, '').slice(0, 3) } : r))
  }

  const updateRow = (rowId, field, value) => {
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, [field]: value } : r))
  }

  const removeRow = (rowId) => {
    setRows(prev => {
      const next = prev.filter(r => r.id !== rowId)
      return next.length === 0 ? [newRow()] : next
    })
  }

  const addRow = () => setRows(prev => [...prev, newRow()])

  const saveToList = () => {
    const validRows = rows.filter(r => /^\d{2,3}$/.test(r.number) && (Number(r.priceTop) > 0 || Number(r.priceBottom) > 0))
    if (validRows.length === 0) return
    setGroups(prev => [...prev, {
      id: Date.now(),
      drawType,
      drawDate,
      items: validRows.map(r => ({ ...r, priceTop: r.priceTop || 0, priceBottom: r.priceBottom || 0 })),
    }])
    setRows([newRow()])
    setBulkTop('')
    setBulkBottom('')
  }

  const removeFromGroup = (groupId, rowId) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g
      const items = g.items.filter(i => i.id !== rowId)
      return items.length === 0 ? null : { ...g, items }
    }).filter(Boolean))
  }

  const cancelGroup = (groupId) => setGroups(prev => prev.filter(g => g.id !== groupId))

  const copyAll = async () => {
    const lines = []
    groups.forEach(g => {
      lines.push(`=== ${drawLabel(g.drawType)} ${g.drawDate} ===`)
      g.items.forEach(item => {
        const parts = [item.number]
        if (Number(item.priceTop) > 0) parts.push(`บน ${item.priceTop}฿`)
        if (Number(item.priceBottom) > 0) {
          const lbl = item.number.length === 3 ? 'ล่าง/โต๊ด' : 'ล่าง'
          parts.push(`${lbl} ${item.priceBottom}฿`)
        }
        lines.push(parts.join(' | '))
      })
      lines.push('')
    })
    await navigator.clipboard.writeText(lines.join('\n'))
    setCopyDone(true)
    setTimeout(() => setCopyDone(false), 2000)
  }

  const saveToPurchases = async () => {
    if (groups.length === 0) return
    setSaving(true)
    try {
      for (const g of groups) {
        for (const item of g.items) {
          if (Number(item.priceTop) > 0) {
            await fetch(`${apiBase}/api/purchases`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                draw_type: g.drawType,
                draw_date: g.drawDate,
                number: item.number,
                bet_type: 'บน',
                amount: Number(item.priceTop),
              }),
            })
          }
          if (Number(item.priceBottom) > 0) {
            await fetch(`${apiBase}/api/purchases`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                draw_type: g.drawType,
                draw_date: g.drawDate,
                number: item.number,
                bet_type: item.number.length === 3 ? 'โต๊ด' : 'ล่าง',
                amount: Number(item.priceBottom),
              }),
            })
          }
        }
      }
      setGroups([])
      setSaveDone(true)
      setTimeout(() => setSaveDone(false), 3000)
    } catch (e) {
      onError && onError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const totalItems = groups.reduce((s, g) => s + g.items.length, 0)
  const hasValidRows = rows.some(r => /^\d{2,3}$/.test(r.number))

  return (
    <section className="bill-page">
      {showHelp && <HelpModal title="วิธีใช้ สร้างบิล" steps={HELP_STEPS} onClose={() => setShowHelp(false)} />}

      <div className="bill-header">
        <h2>🧾 สร้างบิล <button className="help-btn" onClick={() => setShowHelp(true)} title="วิธีใช้">?</button></h2>
        <p>จัดชุดเลข กำหนดราคา และบันทึกลงประวัติ</p>
      </div>

      <div className="bill-settings">
        <div className="bill-setting-item">
          <label>ประเภทหวย</label>
          <select className="fav-select" value={drawType} onChange={e => setDrawType(e.target.value)}>
            {DRAW_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        <div className="bill-setting-item">
          <label>งวดวันที่</label>
          <input className="fav-input" type="date" value={drawDate} onChange={e => setDrawDate(e.target.value)} />
        </div>
      </div>

      <div className="bill-table-wrap">
        <div className="bill-table-head">
          <span className="bill-col-num">เลข</span>
          <span className="bill-col-price">บน (฿)</span>
          <span className="bill-col-price">ล่าง/โต๊ด (฿)</span>
          <span className="bill-col-del" />
        </div>

        <div className="bill-bulk-row">
          <span className="bill-bulk-label">ตั้งราคาทุกเลข</span>
          <input
            className="bill-price-input"
            type="number"
            inputMode="numeric"
            placeholder="บน"
            value={bulkTop}
            onChange={e => setBulkTop(e.target.value)}
            min={0}
          />
          <input
            className="bill-price-input"
            type="number"
            inputMode="numeric"
            placeholder="ล่าง/โต๊ด"
            value={bulkBottom}
            onChange={e => setBulkBottom(e.target.value)}
            min={0}
          />
          <button className="bill-bulk-btn" onClick={applyBulk}>ตั้งราคา</button>
        </div>

        {rows.map((row, idx) => (
          <div key={row.id} className="bill-row">
            <input
              className="bill-num-input"
              type="text"
              inputMode="numeric"
              placeholder={`เลข ${idx + 1}`}
              value={row.number}
              onChange={e => handleNumberChange(row.id, e.target.value)}
              onPaste={e => {
                e.preventDefault()
                handleNumberChange(row.id, e.clipboardData.getData('text'))
              }}
              maxLength={12}
            />
            <input
              className="bill-price-input"
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={row.priceTop}
              onChange={e => updateRow(row.id, 'priceTop', e.target.value)}
              min={0}
            />
            <input
              className="bill-price-input"
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={row.priceBottom}
              onChange={e => updateRow(row.id, 'priceBottom', e.target.value)}
              min={0}
            />
            <button className="bill-del-btn" onClick={() => removeRow(row.id)} title="ลบแถวนี้">×</button>
          </div>
        ))}

        <div className="bill-row-actions">
          <button className="bill-add-row-btn" onClick={addRow}>+ เพิ่มแถว</button>
          <button className="bill-save-btn" onClick={saveToList} disabled={!hasValidRows}>
            ✓ บันทึกลง list
          </button>
        </div>
      </div>

      {groups.length > 0 && (
        <div className="bill-groups">
          <div className="bill-groups-head">
            <span>{totalItems} เลข — {groups.length} ชุด</span>
          </div>

          {groups.map((g, gi) => (
            <div key={g.id} className="bill-group">
              <div className="bill-group-header">
                <span className="bill-group-title">ชุดที่ {gi + 1} · {drawLabel(g.drawType)} {g.drawDate}</span>
                <button className="bill-cancel-group" onClick={() => cancelGroup(g.id)}>ยกเลิกทั้งชุด</button>
              </div>
              <div className="bill-group-items">
                {g.items.map(item => (
                  <button
                    key={item.id}
                    className="bill-item-chip"
                    onClick={() => removeFromGroup(g.id, item.id)}
                    title="กดเพื่อลบ"
                  >
                    <span className="bill-item-num">{item.number}</span>
                    {Number(item.priceTop) > 0 && <span className="bill-item-price">บน {item.priceTop}</span>}
                    {Number(item.priceBottom) > 0 && (
                      <span className="bill-item-price">
                        {item.number.length === 3 ? 'โต๊ด' : 'ล่าง'} {item.priceBottom}
                      </span>
                    )}
                    <span className="bill-item-x">×</span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="bill-actions">
            <button className="bill-copy-btn" onClick={copyAll}>
              {copyDone ? '✓ คัดลอกแล้ว' : '📋 Copy ทั้งหมด'}
            </button>
            <button className="bill-commit-btn" onClick={saveToPurchases} disabled={saving}>
              {saving ? 'กำลังบันทึก...' : saveDone ? '✓ บันทึกแล้ว!' : '💾 บันทึกลงประวัติการซื้อ'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
