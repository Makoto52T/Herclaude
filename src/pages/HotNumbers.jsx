import { useEffect, useState } from 'react'

const DRAW_TYPES = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'thai_gov', label: 'หวยรัฐบาล' },
  { value: 'hanoi', label: 'หวยฮานอย' },
  { value: 'lao', label: 'หวยลาว' },
]

export default function HotNumbers({ apiBase, onError }) {
  const [drawType, setDrawType] = useState('all')
  const [days, setDays] = useState(7)
  const [hot, setHot] = useState([])
  const [loading, setLoading] = useState(false)

  const load = (type, d) => {
    setLoading(true)
    fetch(`${apiBase}/api/hot?type=${type}&days=${d}&limit=20`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => setHot(data.hot || []))
      .catch(e => onError && onError('โหลดเลขฮอตไม่สำเร็จ: ' + e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(drawType, days) }, [drawType, days])

  const maxCount = hot[0]?.total_count || 1

  return (
    <section className="hot-page">
      <div className="stats-header">
        <h2>🔥 เลขฮอต Community</h2>
        <p>เลขที่ user คนอื่น ๆ ค้นหามากที่สุดในช่วงนี้</p>
      </div>

      <div className="stats-controls">
        <div className="stats-tabs">
          {DRAW_TYPES.map(d => (
            <button
              key={d.value}
              className={`stats-tab ${drawType === d.value ? 'active' : ''}`}
              onClick={() => setDrawType(d.value)}
            >{d.label}</button>
          ))}
        </div>
        <select
          className="stats-days-select"
          value={days}
          onChange={e => setDays(Number(e.target.value))}
        >
          <option value={1}>วันนี้</option>
          <option value={7}>7 วัน</option>
          <option value={30}>30 วัน</option>
        </select>
      </div>

      {loading ? (
        <div className="stats-loading">กำลังโหลด...</div>
      ) : hot.length === 0 ? (
        <div className="stats-empty">
          <p>ยังไม่มีข้อมูล — ข้อมูลจะถูกรวบรวมเมื่อ user ค้นหาเลขในหน้าสถิติ</p>
        </div>
      ) : (
        <div className="hot-list">
          {hot.map((h, i) => (
            <div key={`${h.number}-${h.draw_type}`} className="hot-row">
              <span className={`hot-rank ${i < 3 ? 'hot-rank-top' : ''}`}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </span>
              <span className="hot-num">{h.number}</span>
              <div className="hot-bar-wrap">
                <div
                  className="hot-bar"
                  style={{ width: `${Math.round((h.total_count / maxCount) * 100)}%` }}
                />
              </div>
              <span className="hot-count">{h.total_count} คน</span>
            </div>
          ))}
        </div>
      )}

      <div className="hot-note">
        <p>🔒 ข้อมูลนี้รวมเฉพาะ user ที่ล็อกอินและค้นหาสถิติเลข — ไม่ระบุตัวตน</p>
      </div>
    </section>
  )
}
