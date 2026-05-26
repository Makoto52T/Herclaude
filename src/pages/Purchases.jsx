import { useEffect, useState } from 'react'

const DRAW_TYPES = [
  { value: 'thai_gov', label: 'หวยรัฐบาล' },
  { value: 'hanoi', label: 'หวยฮานอย' },
  { value: 'lao', label: 'หวยลาว' },
]

const BET_TYPES = ['บน', 'ล่าง', 'โต๊ด', 'วิ่งบน', 'วิ่งล่าง']

function drawLabel(type) {
  return DRAW_TYPES.find(d => d.value === type)?.label || type
}

function formatDate(ms) {
  return new Date(ms).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function Purchases({ apiBase, onError }) {
  const [purchases, setPurchases] = useState([])
  const [pnl, setPnl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editPayout, setEditPayout] = useState('')
  const [editResult, setEditResult] = useState('won')

  const [form, setForm] = useState({
    draw_type: 'thai_gov',
    draw_date: todayStr(),
    number: '',
    bet_type: 'บน',
    amount: '',
  })

  const load = async () => {
    const [purRes, pnlRes] = await Promise.all([
      fetch(`${apiBase}/api/purchases`, { credentials: 'include' }),
      fetch(`${apiBase}/api/purchases/pnl`, { credentials: 'include' }),
    ])
    const purData = await purRes.json()
    const pnlData = await pnlRes.json()
    setPurchases(purData.purchases || [])
    setPnl(pnlData)
  }

  useEffect(() => {
    load().catch(e => onError && onError(e.message)).finally(() => setLoading(false))
  }, [])

  const addPurchase = async () => {
    if (!form.number || !form.amount) return
    try {
      const r = await fetch(`${apiBase}/api/purchases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      })
      if (!r.ok) { const d = await r.json(); onError && onError(d.error); return }
      setShowForm(false)
      setForm({ draw_type: 'thai_gov', draw_date: todayStr(), number: '', bet_type: 'บน', amount: '' })
      await load()
    } catch (e) { onError && onError(e.message) }
  }

  const saveEdit = async () => {
    try {
      await fetch(`${apiBase}/api/purchases/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ payout: Number(editPayout) || 0, result: editResult }),
      })
      setEditId(null)
      await load()
    } catch (e) { onError && onError(e.message) }
  }

  if (loading) return <div className="pur-empty">กำลังโหลด...</div>

  const netColor = pnl && pnl.netPnL >= 0 ? 'var(--green)' : 'var(--red)'

  return (
    <section className="pur-page">
      <div className="pur-header">
        <h2>💰 ประวัติการซื้อ</h2>
        <p>บันทึกการแทงหวย ติดตามกำไร-ขาดทุน</p>
      </div>

      {pnl && (
        <div className="pnl-card">
          <div className="pnl-item">
            <span className="pnl-lbl">แทงไป</span>
            <span className="pnl-val">{pnl.totalBet.toLocaleString()}฿</span>
          </div>
          <div className="pnl-item">
            <span className="pnl-lbl">ได้กลับ</span>
            <span className="pnl-val">{pnl.totalPayout.toLocaleString()}฿</span>
          </div>
          <div className="pnl-item pnl-net">
            <span className="pnl-lbl">กำไร/ขาดทุน</span>
            <span className="pnl-val" style={{ color: netColor }}>
              {pnl.netPnL >= 0 ? '+' : ''}{pnl.netPnL.toLocaleString()}฿
            </span>
          </div>
        </div>
      )}

      <button className="pur-btn-add" onClick={() => setShowForm(v => !v)}>
        {showForm ? '✕ ยกเลิก' : '+ บันทึกการซื้อ'}
      </button>

      {showForm && (
        <div className="pur-form">
          <div className="pur-form-row">
            <label>ประเภทหวย</label>
            <select
              className="fav-select"
              value={form.draw_type}
              onChange={e => setForm(f => ({ ...f, draw_type: e.target.value }))}
            >
              {DRAW_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          <div className="pur-form-row">
            <label>งวดวันที่</label>
            <input
              className="fav-input"
              type="date"
              value={form.draw_date}
              onChange={e => setForm(f => ({ ...f, draw_date: e.target.value }))}
            />
          </div>
          <div className="pur-form-row">
            <label>เลขที่แทง</label>
            <input
              className="fav-input"
              type="text"
              inputMode="numeric"
              placeholder="เช่น 23, 456"
              value={form.number}
              onChange={e => setForm(f => ({ ...f, number: e.target.value.replace(/\D/g, '') }))}
              maxLength={6}
            />
          </div>
          <div className="pur-form-row">
            <label>ประเภทการแทง</label>
            <select
              className="fav-select"
              value={form.bet_type}
              onChange={e => setForm(f => ({ ...f, bet_type: e.target.value }))}
            >
              {BET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="pur-form-row">
            <label>จำนวนเงิน (฿)</label>
            <input
              className="fav-input"
              type="number"
              inputMode="numeric"
              placeholder="เช่น 100"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              min={1}
            />
          </div>
          <button className="fav-btn-add" onClick={addPurchase} disabled={!form.number || !form.amount}>
            บันทึก
          </button>
        </div>
      )}

      {purchases.length === 0 ? (
        <div className="pur-empty">ยังไม่มีรายการ — กด "+ บันทึกการซื้อ" เพื่อเริ่ม</div>
      ) : (
        <div className="pur-list">
          {purchases.map(p => (
            <div key={p.id} className={`pur-item pur-${p.result}`}>
              <div className="pur-item-main">
                <span className="pur-item-num">{p.number}</span>
                <span className="pur-item-type">{drawLabel(p.draw_type)}</span>
                <span className="pur-item-bet">{p.bet_type}</span>
                <span className="pur-item-date">{p.draw_date}</span>
              </div>
              <div className="pur-item-right">
                <span className="pur-item-amount">-{p.amount}฿</span>
                {p.payout > 0 && <span className="pur-item-payout">+{p.payout}฿</span>}
                <span className={`pur-badge pur-badge-${p.result}`}>
                  {p.result === 'won' ? '✓ ถูก' : p.result === 'lost' ? '✗ ไม่ถูก' : '⏳ รอผล'}
                </span>
                {p.result === 'pending' && (
                  <button className="pur-btn-edit" onClick={() => {
                    setEditId(p.id); setEditPayout(p.payout || ''); setEditResult('won')
                  }}>อัพเดต</button>
                )}
              </div>
              {editId === p.id && (
                <div className="pur-edit-row">
                  <select
                    className="fav-select"
                    value={editResult}
                    onChange={e => setEditResult(e.target.value)}
                  >
                    <option value="won">ถูก</option>
                    <option value="lost">ไม่ถูก</option>
                  </select>
                  {editResult === 'won' && (
                    <input
                      className="fav-input"
                      type="number"
                      placeholder="เงินที่ได้ (฿)"
                      value={editPayout}
                      onChange={e => setEditPayout(e.target.value)}
                    />
                  )}
                  <button className="fav-btn-add" onClick={saveEdit}>บันทึก</button>
                  <button className="fav-btn-remove" onClick={() => setEditId(null)}>×</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
