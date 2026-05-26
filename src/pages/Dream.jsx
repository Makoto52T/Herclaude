import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import HelpModal from '../HelpModal'

const HELP_STEPS = [
  'พิมพ์สิ่งที่ฝันเห็น เช่น "งู", "พระ", "ช้าง", "เลขทะเบียนรถ"',
  'กด "🔮 ทำนาย" หรือกด Enter เพื่อค้นหา',
  'ระบบจะดึงเลขเด่นจากตำราฝันแบบดั้งเดิม พร้อมความหมาย',
  'กด 📋 เพื่อคัดลอกเลขทั้งหมดที่เกี่ยวกับสิ่งที่ฝันเห็น',
  'ฟีเจอร์นี้ใช้ได้เฉพาะแพลน ครึ่งปี หรือ รายปี เท่านั้น',
]

export default function Dream({ apiBase, hasAccess }) {
  const [showHelp, setShowHelp] = useState(false)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (hasAccess && inputRef.current) inputRef.current.focus()
  }, [hasAccess])

  if (!hasAccess) {
    return (
      <section className="dream-locked">
        <div className="lock-card">
          <div className="lock-icon">🔒</div>
          <h2>ระบบทำนายฝัน — สำหรับสมาชิกพรีเมียม</h2>
          <p>ฟีเจอร์นี้ใช้ได้เฉพาะแพลน <b>ครึ่งปี</b> หรือ <b>รายปี</b> เท่านั้น</p>
          <Link className="btn-upgrade" to="/plans">ดูแพลน / อัพเกรด →</Link>
        </div>
      </section>
    )
  }

  const handleLookup = async (e) => {
    e && e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`${apiBase}/api/dream?q=${encodeURIComponent(query)}`, {
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'เกิดข้อผิดพลาด')
      } else {
        setResult(data)
      }
    } catch (err) {
      setError('เชื่อมต่อไม่สำเร็จ: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const copyNums = (nums) => {
    navigator.clipboard.writeText(nums.join(' '))
  }

  return (
    <>
      {showHelp && <HelpModal title="วิธีใช้ ทำนายฝัน" steps={HELP_STEPS} onClose={() => setShowHelp(false)} />}
      <section className="input-card">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ flex: 1, fontWeight: 600, color: 'var(--text-h)' }}>ทำนายฝัน</span>
          <button className="help-btn" type="button" onClick={() => setShowHelp(true)} title="วิธีใช้">?</button>
        </div>
        <form onSubmit={handleLookup} className="dream-form">
          <input
            ref={inputRef}
            className="num-input"
            type="text"
            placeholder="พิมพ์สิ่งที่ฝันเห็น เช่น งู, พระ, เลขทะเบียนรถ"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <button className="btn-dream" type="submit" disabled={loading || !query.trim()}>
            {loading ? 'กำลังค้น...' : '🔮 ทำนาย'}
          </button>
        </form>
        <div className="digit-info">
          พิมพ์คำที่เห็นในความฝัน → ดึงเลขเด่นจากตำราฝันแบบดั้งเดิม
        </div>
      </section>

      <section className="dream-result">
        {error && <div className="banner banner-error">{error}</div>}
        {result && result.results && result.results.length === 0 && (
          <div className="dream-empty">
            ไม่พบ "{result.query}" ในตำราฝัน ลองคำอื่นดูครับ
          </div>
        )}
        {result && result.results && result.results.length > 0 && (
          <div className="dream-cards">
            {result.results.map((m, idx) => (
              <div className="output-card" key={idx}>
                <div className="output-head">
                  <h3>
                    <span className="ic">🌙</span> {m.matched}
                  </h3>
                  <div className="head-right">
                    <span className="count">{m.numbers.length}</span>
                    {m.numbers.length > 0 && (
                      <button className="btn-copy" onClick={() => copyNums(m.numbers)} title="คัดลอกทั้งหมด">
                        📋
                      </button>
                    )}
                  </div>
                </div>
                {m.meaning && <div className="dream-meaning">{m.meaning}</div>}
                <div className="num-grid">
                  {m.numbers.map((n) => (
                    <span key={n} className="num-chip">{n}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
