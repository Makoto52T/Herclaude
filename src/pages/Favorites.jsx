import { useEffect, useState } from 'react'

const DRAW_TYPES = [
  { value: 'thai_gov', label: 'หวยรัฐบาล' },
  { value: 'hanoi', label: 'หวยฮานอย' },
  { value: 'lao', label: 'หวยลาว' },
]

function drawLabel(type) {
  return DRAW_TYPES.find(d => d.value === type)?.label || type
}

export default function Favorites({ apiBase, onError }) {
  const [favorites, setFavorites] = useState([])
  const [checkResults, setCheckResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newNumber, setNewNumber] = useState('')
  const [newType, setNewType] = useState('thai_gov')
  const [newLabel, setNewLabel] = useState('')

  const load = () => {
    return fetch(`${apiBase}/api/favorites`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => setFavorites(d.favorites || []))
      .catch(e => onError && onError('โหลดเลขโปรดไม่สำเร็จ: ' + e.message))
  }

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [])

  const addFavorite = async () => {
    const n = newNumber.replace(/\D/g, '')
    if (!n) return
    setAdding(true)
    try {
      const r = await fetch(`${apiBase}/api/favorites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ draw_type: newType, number: n, label: newLabel || null }),
      })
      if (!r.ok) {
        const d = await r.json()
        onError && onError(d.error || 'เพิ่มไม่สำเร็จ')
        return
      }
      setNewNumber('')
      setNewLabel('')
      setCheckResults(null)
      await load()
    } catch (e) {
      onError && onError(e.message)
    } finally {
      setAdding(false)
    }
  }

  const removeFavorite = async (drawType, number) => {
    try {
      await fetch(`${apiBase}/api/favorites/${encodeURIComponent(drawType)}/${encodeURIComponent(number)}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      setCheckResults(null)
      await load()
    } catch (e) {
      onError && onError(e.message)
    }
  }

  const checkAll = async () => {
    setChecking(true)
    try {
      const r = await fetch(`${apiBase}/api/favorites/check`, { credentials: 'include' })
      const d = await r.json()
      setCheckResults(d.results || [])
    } catch (e) {
      onError && onError('เช็คผลไม่สำเร็จ: ' + e.message)
    } finally {
      setChecking(false)
    }
  }

  if (loading) return <div className="fav-empty">กำลังโหลด...</div>

  return (
    <section className="fav-page">
      <div className="fav-header">
        <h2>⭐ เลขโปรด</h2>
        <p>บันทึกเลขที่สนใจ และเช็คผลทุกงวดอัตโนมัติ</p>
      </div>

      <div className="fav-add-card">
        <h3>เพิ่มเลขโปรด</h3>
        <div className="fav-add-row">
          <input
            className="fav-input"
            type="text"
            inputMode="numeric"
            placeholder="เลขที่ต้องการบันทึก"
            value={newNumber}
            onChange={e => setNewNumber(e.target.value.replace(/\D/g, ''))}
            maxLength={6}
          />
          <select
            className="fav-select"
            value={newType}
            onChange={e => setNewType(e.target.value)}
          >
            {DRAW_TYPES.map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
          <input
            className="fav-input fav-input-label"
            type="text"
            placeholder="ชื่อ/หมายเหตุ (ไม่บังคับ)"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            maxLength={40}
          />
          <button
            className="fav-btn-add"
            onClick={addFavorite}
            disabled={adding || !newNumber.replace(/\D/g, '')}
          >
            {adding ? '...' : '+ เพิ่ม'}
          </button>
        </div>
      </div>

      {favorites.length > 0 && (
        <div className="fav-check-bar">
          <button className="fav-btn-check" onClick={checkAll} disabled={checking}>
            {checking ? 'กำลังเช็ค...' : '🔍 เช็คผลทุกเลข'}
          </button>
        </div>
      )}

      {checkResults && (
        <div className="fav-results-card">
          <h3>ผลการเช็ค</h3>
          {checkResults.length === 0 ? (
            <p className="fav-no-result">ไม่มีเลขโปรดที่บันทึกไว้</p>
          ) : (
            checkResults.map(r => (
              <div key={r.id} className={`fav-result-row ${r.matched ? 'matched' : ''}`}>
                <span className="fav-result-num">{r.number}</span>
                <span className="fav-result-type">{drawLabel(r.draw_type)}</span>
                {r.label && <span className="fav-result-label">{r.label}</span>}
                {r.matched ? (
                  <span className="fav-result-win">🎉 ถูก!</span>
                ) : r.latest ? (
                  <span className="fav-result-miss">ไม่ถูกงวดล่าสุด ({r.latest.draw_date})</span>
                ) : (
                  <span className="fav-result-miss">ยังไม่มีผลในฐานข้อมูล</span>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {favorites.length === 0 ? (
        <div className="fav-empty">
          <p>ยังไม่มีเลขโปรด — เพิ่มเลขด้านบนได้เลย</p>
        </div>
      ) : (
        <div className="fav-list">
          {favorites.map(f => (
            <div key={f.id} className="fav-item">
              <div className="fav-item-main">
                <span className="fav-item-num">{f.number}</span>
                <span className="fav-item-type">{drawLabel(f.draw_type)}</span>
                {f.label && <span className="fav-item-lbl">{f.label}</span>}
              </div>
              <button
                className="fav-btn-remove"
                onClick={() => removeFavorite(f.draw_type, f.number)}
                title="ลบ"
              >×</button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
