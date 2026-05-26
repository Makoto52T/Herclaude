import { useState, useEffect } from 'react'
import HelpModal from '../HelpModal'

const DRAW_TYPES = [
  { value: 'thai_gov', label: 'หวยรัฐบาล' },
  { value: 'hanoi', label: 'หวยฮานอย' },
  { value: 'lao', label: 'หวยลาว' },
]

const QUICK_AMOUNTS = [10, 20, 50, 100]

const PAYOUT_PRESETS = [
  { id: 'standard', label: 'มาตรฐาน', rates: { top3: 500, toad3: 100, top2: 70, bottom2: 70 } },
  { id: 'high',     label: 'สูง',      rates: { top3: 500, toad3: 150, top2: 92, bottom2: 92 } },
  { id: 'custom',   label: 'กำหนดเอง', rates: null },
]

const DEFAULT_CUSTOM_RATES = { top3: 500, toad3: 100, top2: 70, bottom2: 70 }

function loadPayoutState() {
  try {
    const saved = JSON.parse(localStorage.getItem('bill_payout') || '{}')
    return {
      presetId: saved.presetId || 'standard',
      custom: { ...DEFAULT_CUSTOM_RATES, ...(saved.custom || {}) },
    }
  } catch {
    return { presetId: 'standard', custom: { ...DEFAULT_CUSTOM_RATES } }
  }
}

function getRates(presetId, custom) {
  const preset = PAYOUT_PRESETS.find(p => p.id === presetId)
  return presetId === 'custom' ? custom : (preset?.rates || PAYOUT_PRESETS[0].rates)
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function drawLabel(type) {
  return DRAW_TYPES.find(d => d.value === type)?.label || type
}

let _uid = 1

function parseNumbers(text) {
  return text.split(/[\s,\n]+/)
    .map(s => s.replace(/\D/g, ''))
    .filter(n => n.length >= 2 && n.length <= 3)
}

export default function CreateBill({ apiBase, onError }) {
  const [showHelp, setShowHelp] = useState(false)
  const [drawType, setDrawType] = useState('thai_gov')
  const [drawDate, setDrawDate] = useState(todayStr())

  const initialPayout = loadPayoutState()
  const [payoutPresetId, setPayoutPresetId] = useState(initialPayout.presetId)
  const [customRates, setCustomRates]       = useState(initialPayout.custom)

  useEffect(() => {
    localStorage.setItem('bill_payout', JSON.stringify({ presetId: payoutPresetId, custom: customRates }))
  }, [payoutPresetId, customRates])

  const activeRates = getRates(payoutPresetId, customRates)

  const [numberInput, setNumberInput] = useState('')
  const [betTypes, setBetTypes] = useState({ top: true, bottom: false, toad: false })
  const [reverseNumbers, setReverseNumbers] = useState(false)
  const [priceTop, setPriceTop] = useState('')
  const [priceBottom, setPriceBottom] = useState('')
  const [priceToad, setPriceToad] = useState('')

  const [cart, setCart] = useState([])
  const [saving, setSaving] = useState(false)
  const [saveDone, setSaveDone] = useState(false)
  const [copyDone, setCopyDone] = useState(false)

  const parsedNumbers = parseNumbers(numberInput)
  const singleNumber = /^\d{2,3}$/.test(numberInput.trim()) ? [numberInput.trim()] : []
  const activeNumbers = parsedNumbers.length > 1 ? parsedNumbers : singleNumber

  const toggleBetType = (type) => setBetTypes(prev => ({ ...prev, [type]: !prev[type] }))

  const getReversed = (num) => num.split('').reverse().join('')

  const expandNumbers = (nums) => {
    if (!reverseNumbers) return nums
    const set = new Set(nums)
    nums.forEach(n => set.add(getReversed(n)))
    return [...set]
  }

  const canAdd = () => {
    if (activeNumbers.length === 0) return false
    if (!betTypes.top && !betTypes.bottom && !betTypes.toad) return false
    if (betTypes.top && !priceTop) return false
    if (betTypes.bottom && !priceBottom) return false
    if (betTypes.toad && !priceToad) return false
    return true
  }

  const addToCart = () => {
    if (!canAdd()) return
    const newItems = []
    expandNumbers(activeNumbers).forEach(num => {
      if (betTypes.top && Number(priceTop) > 0) {
        newItems.push({ id: _uid++, number: num, betType: 'บน', price: Number(priceTop), drawType, drawDate })
      }
      if (betTypes.bottom && Number(priceBottom) > 0) {
        newItems.push({ id: _uid++, number: num, betType: 'ล่าง', price: Number(priceBottom), drawType, drawDate })
      }
      if (betTypes.toad && Number(priceToad) > 0 && num.length === 3) {
        newItems.push({ id: _uid++, number: num, betType: 'โต๊ด', price: Number(priceToad), drawType, drawDate })
      }
    })
    if (newItems.length === 0) return
    setCart(prev => [...prev, ...newItems])
    setNumberInput('')
  }

  const removeFromCart = (id) => setCart(prev => prev.filter(item => item.id !== id))
  const clearCart = () => setCart([])

  const totalAmount = cart.reduce((s, item) => s + item.price, 0)

  const cartByNumber = Object.values(
    cart.reduce((acc, item) => {
      const key = `${item.number}|${item.drawType}|${item.drawDate}`
      if (!acc[key]) acc[key] = { number: item.number, drawType: item.drawType, drawDate: item.drawDate, bets: [] }
      acc[key].bets.push(item)
      return acc
    }, {})
  )

  const copyAll = async () => {
    const lines = []
    const groups = {}
    cart.forEach(item => {
      const key = `${item.drawType}|${item.drawDate}`
      if (!groups[key]) groups[key] = []
      groups[key].push(item)
    })
    Object.entries(groups).forEach(([key, items]) => {
      const [dt, dd] = key.split('|')
      lines.push(`=== ${drawLabel(dt)} ${dd} ===`)
      items.forEach(item => lines.push(`${item.number} ${item.betType} ${item.price}฿`))
      lines.push('')
    })
    lines.push(`รวม: ${totalAmount.toLocaleString()}฿`)
    await navigator.clipboard.writeText(lines.join('\n'))
    setCopyDone(true)
    setTimeout(() => setCopyDone(false), 2000)
  }

  const saveToPurchases = async () => {
    if (cart.length === 0) return
    setSaving(true)
    try {
      for (const item of cart) {
        await fetch(`${apiBase}/api/purchases`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            draw_type: item.drawType,
            draw_date: item.drawDate,
            number: item.number,
            bet_type: item.betType,
            amount: item.price,
          }),
        })
      }
      setCart([])
      setSaveDone(true)
      setTimeout(() => setSaveDone(false), 3000)
    } catch (e) {
      onError && onError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="bill-page">
      {showHelp && (
        <HelpModal
          title="วิธีใช้ สร้างบิล"
          steps={[
            'เลือกประเภทหวยและงวดวันที่',
            'กรอกเลข 2 หรือ 3 ตัว — หรือวางหลายเลขพร้อมกัน เช่น "12 22 36"',
            'เลือกประเภทการแทง: บน / ล่าง / โต๊ด (เลือกได้หลายประเภท)',
            'กดปุ่มราคา หรือกรอกราคาเอง แล้วกด "เพิ่มลงตะกร้า"',
            'ทำซ้ำได้หลายรอบ ตะกร้าแสดงยอดรวมทั้งหมด',
            'กด "ยืนยันรายการ" เพื่อบันทึกลงประวัติการซื้อ',
          ]}
          onClose={() => setShowHelp(false)}
        />
      )}

      <div className="bill-header">
        <h2>🧾 สร้างบิล <button className="help-btn" onClick={() => setShowHelp(true)}>?</button></h2>
      </div>

      {/* Step 1: Lottery type */}
      <div className="shop-step">
        <div className="shop-step-label">1 · ประเภทหวย</div>
        <div className="bill-type-tabs">
          {DRAW_TYPES.map(d => (
            <button
              key={d.value}
              className={'bill-type-tab' + (drawType === d.value ? ' active' : '')}
              onClick={() => setDrawType(d.value)}
            >
              {d.label}
            </button>
          ))}
        </div>
        <div className="bill-date-row">
          <span className="bill-date-label">งวดวันที่</span>
          <input
            className="bill-date-input"
            type="date"
            value={drawDate}
            onChange={e => setDrawDate(e.target.value)}
          />
        </div>
      </div>

      {/* Payout rates */}
      <div className="shop-step">
        <div className="shop-step-label">1.5 · อัตราจ่ายต่อบาท</div>
        <div className="payout-presets">
          {PAYOUT_PRESETS.map(p => (
            <button
              key={p.id}
              className={'payout-preset-btn' + (payoutPresetId === p.id ? ' active' : '')}
              onClick={() => setPayoutPresetId(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {payoutPresetId !== 'custom' ? (
          <div className="payout-rate-display">
            {[
              { label: '3 ตัวบน', key: 'top3' },
              { label: '3 ตัวโต๊ด', key: 'toad3' },
              { label: '2 ตัวบน', key: 'top2' },
              { label: '2 ตัวล่าง', key: 'bottom2' },
            ].map(({ label, key }) => (
              <div key={key} className="payout-rate-chip">
                <span className="payout-rate-type">{label}</span>
                <span className="payout-rate-val">×{activeRates[key]}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="payout-custom-grid">
            {[
              { label: '3 ตัวบน', key: 'top3' },
              { label: '3 ตัวโต๊ด', key: 'toad3' },
              { label: '2 ตัวบน', key: 'top2' },
              { label: '2 ตัวล่าง', key: 'bottom2' },
            ].map(({ label, key }) => (
              <label key={key} className="payout-custom-item">
                <span>{label}</span>
                <input
                  type="number"
                  className="payout-custom-input"
                  value={customRates[key]}
                  onChange={e => setCustomRates(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                  min={1}
                />
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Step 2: Bet slip */}
      <div className="shop-step">
        <div className="shop-step-label">2 · กรอกเลขและราคา</div>
        <div className="bet-slip">
          <input
            className="bet-number-input"
            type="text"
            inputMode="numeric"
            placeholder="กรอกเลข เช่น 12 หรือ 12 22 36"
            value={numberInput}
            onChange={e => setNumberInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addToCart() }}
            onPaste={e => {
              e.preventDefault()
              setNumberInput(e.clipboardData.getData('text'))
            }}
          />
          {parsedNumbers.length > 1 && (
            <div className="bet-parsed-preview">
              {parsedNumbers.map((n, i) => <span key={i} className="bet-preview-chip">{n}</span>)}
            </div>
          )}

          <label className="bet-reverse-toggle">
            <input
              type="checkbox"
              checked={reverseNumbers}
              onChange={e => setReverseNumbers(e.target.checked)}
            />
            <span>เลขกลับ <span className="bet-type-note">(เพิ่มเลขสลับตำแหน่งอัตโนมัติ)</span></span>
          </label>

          {/* Bet type toggles */}
          <div className="bet-type-list">
            {[
              { key: 'top', label: 'บน', price: priceTop, setPrice: setPriceTop },
              { key: 'bottom', label: 'ล่าง', price: priceBottom, setPrice: setPriceBottom },
              { key: 'toad', label: 'โต๊ด', price: priceToad, setPrice: setPriceToad, note: '3 ตัวเท่านั้น' },
            ].map(({ key, label, price, setPrice, note }) => (
              <div key={key} className={'bet-type-item' + (betTypes[key] ? ' active' : '')}>
                <button
                  className={'bet-type-toggle' + (betTypes[key] ? ' active' : '')}
                  onClick={() => toggleBetType(key)}
                >
                  <span className="bet-type-check">{betTypes[key] ? '✓' : ''}</span>
                  {label}
                  {note && <span className="bet-type-note">{note}</span>}
                </button>
                {betTypes[key] && (
                  <div className="bet-price-row">
                    <div className="bet-quick-amounts">
                      {QUICK_AMOUNTS.map(a => (
                        <button
                          key={a}
                          className={'bet-quick-btn' + (price === String(a) ? ' active' : '')}
                          onClick={() => setPrice(String(a))}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                    <input
                      className="bet-price-in"
                      type="number"
                      inputMode="numeric"
                      placeholder="฿"
                      value={price}
                      onChange={e => setPrice(e.target.value)}
                      min={1}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <button className="bet-add-btn" onClick={addToCart} disabled={!canAdd()}>
            + เพิ่มลงตะกร้า
            {activeNumbers.length > 1 && (
              <span className="bet-add-badge">{activeNumbers.length} เลข</span>
            )}
          </button>
        </div>
      </div>

      {/* Step 3: Cart */}
      {cart.length > 0 && (
        <div className="shop-step">
          <div className="shop-step-label">3 · ตรวจสอบรายการ</div>
          <div className="bill-cart">
            <div className="bill-cart-head">
              <span className="bill-cart-title">🛒 ตะกร้า</span>
              <span className="bill-cart-count">{cart.length} รายการ</span>
              <button className="bill-cart-clear" onClick={clearCart}>ล้างทั้งหมด</button>
            </div>

            <div className="bill-cart-items">
              {cartByNumber.map((group, gi) => (
                <div key={gi} className="bill-cart-ticket">
                  <div className="bill-ticket-left">
                    <div className="bill-ticket-number">{group.number}</div>
                    <div className="bill-ticket-draw">{drawLabel(group.drawType)}</div>
                  </div>
                  <div className="bill-ticket-bets">
                    {group.bets.map(bet => (
                      <div key={bet.id} className="bill-ticket-bet-row">
                        <span className={`bill-bet-badge bill-bet-${bet.betType === 'บน' ? 'top' : bet.betType === 'ล่าง' ? 'bot' : 'toad'}`}>
                          {bet.betType}
                        </span>
                        <span className="bill-bet-price">{bet.price.toLocaleString()}฿</span>
                        <button className="bill-ticket-remove" onClick={() => removeFromCart(bet.id)} title="ลบ">×</button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="bill-cart-footer">
              <div className="bill-cart-total">
                <span>ยอดรวมทั้งหมด</span>
                <span className="bill-total-amount">{totalAmount.toLocaleString()} ฿</span>
              </div>
              <div className="bill-cart-actions">
                <button className="bill-copy-btn" onClick={copyAll}>
                  {copyDone ? '✓ คัดลอกแล้ว' : '📋 คัดลอก'}
                </button>
                <button className="bill-commit-btn" onClick={saveToPurchases} disabled={saving}>
                  {saving ? 'กำลังบันทึก...' : saveDone ? '✓ บันทึกแล้ว!' : '✅ ยืนยันรายการ'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
