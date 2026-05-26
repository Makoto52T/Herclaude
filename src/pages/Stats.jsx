import { useEffect, useState } from 'react'

const DRAW_TYPES = [
  { value: 'thai_gov', label: 'หวยรัฐบาล' },
  { value: 'hanoi', label: 'หวยฮานอย' },
  { value: 'lao', label: 'หวยลาว' },
]

const DIGIT_OPTIONS = [
  { value: 2, label: '2 ตัว' },
  { value: 3, label: '3 ตัว' },
]

export default function Stats({ apiBase, onError }) {
  const [drawType, setDrawType] = useState('thai_gov')
  const [days, setDays] = useState(90)
  const [stats, setStats] = useState([])
  const [loading, setLoading] = useState(false)

  const [predType, setPredType] = useState('thai_gov')
  const [predDigits, setPredDigits] = useState(2)
  const [prediction, setPrediction] = useState(null)
  const [predLoading, setPredLoading] = useState(false)

  const loadStats = (type, d) => {
    setLoading(true)
    fetch(`${apiBase}/api/stats?type=${type}&days=${d}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => setStats(data.stats || []))
      .catch(e => onError && onError('โหลดสถิติไม่สำเร็จ: ' + e.message))
      .finally(() => setLoading(false))
  }

  const loadPrediction = (type, digits) => {
    setPredLoading(true)
    setPrediction(null)
    fetch(`${apiBase}/api/prediction?type=${type}&digits=${digits}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => setPrediction(data))
      .catch(e => onError && onError('โหลด prediction ไม่สำเร็จ: ' + e.message))
      .finally(() => setPredLoading(false))
  }

  useEffect(() => { loadStats(drawType, days) }, [drawType, days])
  useEffect(() => { loadPrediction(predType, predDigits) }, [predType, predDigits])

  const maxCount = stats[0]?.count || 1

  return (
    <section className="stats-page">
      <div className="stats-header">
        <h2>📊 สถิติเลขดัง</h2>
        <p>ความถี่ของเลขที่ออกในแต่ละประเภทหวย</p>
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
          <option value={30}>30 วัน</option>
          <option value={60}>60 วัน</option>
          <option value={90}>90 วัน</option>
          <option value={180}>180 วัน</option>
        </select>
      </div>

      {loading ? (
        <div className="stats-loading">กำลังโหลดสถิติ...</div>
      ) : stats.length === 0 ? (
        <div className="stats-empty">ยังไม่มีข้อมูลผลรางวัลในฐานข้อมูล</div>
      ) : (
        <div className="stats-list">
          {stats.slice(0, 30).map((s, i) => (
            <div key={s.number} className="stats-row">
              <span className="stats-rank">#{i + 1}</span>
              <span className="stats-num">{s.number}</span>
              <div className="stats-bar-wrap">
                <div
                  className="stats-bar"
                  style={{ width: `${Math.round((s.count / maxCount) * 100)}%` }}
                />
              </div>
              <span className="stats-count">{s.count} ครั้ง</span>
            </div>
          ))}
        </div>
      )}

      <div className="pred-section">
        <div className="pred-header">
          <h2>🔮 Prediction Confidence</h2>
          <p className="pred-disclaimer">
            วิเคราะห์จาก pattern ความถี่ + ระยะเวลา — <strong>เพื่อความบันเทิงเท่านั้น ไม่ใช่การทำนาย</strong>
          </p>
        </div>

        <div className="pred-controls">
          <div className="stats-tabs">
            {DRAW_TYPES.map(d => (
              <button
                key={d.value}
                className={`stats-tab ${predType === d.value ? 'active' : ''}`}
                onClick={() => setPredType(d.value)}
              >{d.label}</button>
            ))}
          </div>
          <div className="stats-tabs">
            {DIGIT_OPTIONS.map(d => (
              <button
                key={d.value}
                className={`stats-tab ${predDigits === d.value ? 'active' : ''}`}
                onClick={() => setPredDigits(d.value)}
              >{d.label}</button>
            ))}
          </div>
        </div>

        {predLoading ? (
          <div className="stats-loading">กำลังคำนวณ...</div>
        ) : prediction && prediction.numbers?.length > 0 ? (
          <div className="pred-list">
            {prediction.numbers.map((p, i) => (
              <div key={p.number} className="pred-row">
                <span className="pred-rank">#{i + 1}</span>
                <span className="pred-num">{p.number}</span>
                <div className="pred-meter-wrap">
                  <div
                    className="pred-meter"
                    style={{ width: `${p.confidence}%` }}
                  />
                </div>
                <span className="pred-pct">{p.confidence}%</span>
                <span className="pred-freq">ออก {p.frequency} ครั้ง</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="stats-empty">ยังไม่มีข้อมูลเพียงพอสำหรับ prediction</div>
        )}
      </div>
    </section>
  )
}
