import { useMemo, useState } from 'react'

function parseDigits(s, max) {
  return (s || '').replace(/\D/g, '').slice(0, max)
}

function uniqueSorted(arr) {
  return [...new Set(arr)].sort((a, b) => Number(a) - Number(b))
}

function sumDigits(s) {
  return [...s].reduce((acc, c) => acc + Number(c), 0)
}

// สูตร B1 — คูณคงที่ (×3, ×7, ×9) บนผลรวมหลัก
function formulaMultiplyConstant(last2) {
  if (last2.length !== 2) return null
  const s = sumDigits(last2)
  const out = [3, 7, 9].map((k) => {
    const product = s * k
    return { k, product, lastDigit: product % 10 }
  })
  return { sumOfDigits: s, results: out }
}

// สูตร B2 — บวก/ลบหน้า-หลัง
function formulaAddSubtract(top2, bot2) {
  if (top2.length !== 2 || bot2.length !== 2) return null
  const a = Number(top2)
  const b = Number(bot2)
  const sum = a + b
  const diff = Math.abs(a - b)
  const last2 = (n) => String(n).padStart(2, '0').slice(-2)
  return { sum, diff, sumLast2: last2(sum), diffLast2: last2(diff) }
}

// สูตร B3 — เลขรูดจากเลขเด่น (xx + x*)
function formulaRudFromHotDigits(top2, bot2) {
  if (top2.length !== 2 || bot2.length !== 2) return null
  const all = [...top2, ...bot2]
  const hot = uniqueSorted(all)
  const rud = []
  hot.forEach((d) => {
    for (let i = 0; i <= 9; i++) {
      rud.push(`${d}${i}`)
      if (i !== Number(d)) rud.push(`${i}${d}`)
    }
  })
  return { hotDigits: hot, rud: [...new Set(rud)].sort() }
}

// สูตร B4 — บวกเดือนปัจจุบัน (popular folk method)
function formulaPlusMonth(last2) {
  if (last2.length !== 2) return null
  const m = new Date().getMonth() + 1
  const n = Number(last2)
  const plus = (n + m) % 100
  const minus = ((n - m) + 100) % 100
  const pad = (x) => String(x).padStart(2, '0')
  return { month: m, plus: pad(plus), minus: pad(minus) }
}

function CalcBlock({ title, children, badge }) {
  return (
    <div className="formula-card">
      <div className="formula-head">
        <h3>{title}</h3>
        {badge && <span className="formula-badge">{badge}</span>}
      </div>
      <div className="formula-body">{children}</div>
    </div>
  )
}

function NumChips({ items }) {
  if (!items || items.length === 0) return <span className="empty">—</span>
  return (
    <div className="num-grid">
      {items.map((n) => <span key={n} className="num-chip">{n}</span>)}
    </div>
  )
}

export default function Formulas() {
  const [last, setLast] = useState('')  // 4-digit last result XXYY
  const top2 = useMemo(() => last.slice(0, 2), [last])
  const bot2 = useMemo(() => last.slice(2, 4), [last])

  const f1 = useMemo(() => formulaMultiplyConstant(bot2), [bot2])
  const f2 = useMemo(() => formulaAddSubtract(top2, bot2), [top2, bot2])
  const f3 = useMemo(() => formulaRudFromHotDigits(top2, bot2), [top2, bot2])
  const f4 = useMemo(() => formulaPlusMonth(bot2), [bot2])

  return (
    <>
      <section className="input-card">
        <input
          className="num-input"
          type="text"
          inputMode="numeric"
          placeholder="ใส่ผลงวดล่าสุด 4 หลัก (2 ตัวบน + 2 ตัวล่าง) เช่น 6380"
          value={last}
          onChange={(e) => setLast(parseDigits(e.target.value, 4))}
          maxLength={4}
        />
        <div className="digit-info">
          {last.length === 4
            ? <>บน: <strong>{top2}</strong> · ล่าง: <strong>{bot2}</strong></>
            : 'ใส่เลข 4 หลัก เพื่อรันสูตรทั้งหมด'}
        </div>
      </section>

      <div className="formula-disclaimer">
        ⚠️ <strong>สูตรเหล่านี้เป็นเครื่องมือจัดระเบียบความคิด ไม่รับประกันการถูกรางวัล</strong> —
        ทุกงวดของหวยเป็นเหตุการณ์สุ่มอิสระ โอกาสถูกเท่ากับสัดส่วนเลขที่คุณเลือก ÷ จำนวนเลขทั้งหมด
      </div>

      {last.length === 4 && (
        <div className="formulas-grid">
          <CalcBlock title="สูตรคูณคงที่ (×3, ×7, ×9)" badge="B1">
            <p className="formula-step">
              ผลรวมหลักของ <strong>{bot2}</strong> = {bot2[0]} + {bot2[1]} = <strong>{f1.sumOfDigits}</strong>
            </p>
            <ul className="formula-list">
              {f1.results.map((r) => (
                <li key={r.k}>
                  {f1.sumOfDigits} × {r.k} = {r.product} → หลักหน่วย = <strong>{r.lastDigit}</strong>
                </li>
              ))}
            </ul>
            <div className="formula-out">
              <span className="out-label">เลขเด่น:</span>
              <NumChips items={uniqueSorted(f1.results.map((r) => String(r.lastDigit)))} />
            </div>
          </CalcBlock>

          <CalcBlock title="สูตรบวก/ลบ หน้า-หลัง" badge="B2">
            <p className="formula-step">
              บน <strong>{top2}</strong> + ล่าง <strong>{bot2}</strong> = <strong>{f2.sum}</strong> → 2 ตัวท้าย = <strong>{f2.sumLast2}</strong>
            </p>
            <p className="formula-step">
              |{top2} − {bot2}| = <strong>{f2.diff}</strong> → 2 ตัวท้าย = <strong>{f2.diffLast2}</strong>
            </p>
            <div className="formula-out">
              <span className="out-label">เลข 2 ตัว:</span>
              <NumChips items={[f2.sumLast2, f2.diffLast2]} />
            </div>
          </CalcBlock>

          <CalcBlock title="สูตรรูดจากเลขในผลงวดก่อน" badge="B3">
            <p className="formula-step">
              หลักที่ปรากฏใน {top2}{bot2}: <strong>{f3.hotDigits.join(', ')}</strong>
            </p>
            <p className="formula-step">นำแต่ละหลักไปรูดทั้งบนและล่าง (xx, x*, *x)</p>
            <div className="formula-out">
              <span className="out-label">เลขรูด 2 ตัว ({f3.rud.length} ตัว):</span>
              <NumChips items={f3.rud} />
            </div>
          </CalcBlock>

          <CalcBlock title="สูตรบวก/ลบเดือนปัจจุบัน" badge="B4">
            <p className="formula-step">
              เดือนนี้ = <strong>{f4.month}</strong> · ล่าง = <strong>{bot2}</strong>
            </p>
            <p className="formula-step">{bot2} + {f4.month} = <strong>{f4.plus}</strong></p>
            <p className="formula-step">{bot2} − {f4.month} = <strong>{f4.minus}</strong></p>
            <div className="formula-out">
              <span className="out-label">เลข 2 ตัว:</span>
              <NumChips items={[f4.plus, f4.minus]} />
            </div>
          </CalcBlock>
        </div>
      )}

      {last.length === 4 && (
        <div className="formula-foot">
          💡 หลังจากรันสูตรแล้ว แนะนำให้เอา <strong>เลขเด่น</strong> ที่ได้ไป
          <a href="/" style={{ color: 'var(--accent)', marginLeft: 4 }}>วินต่อในหน้าวินเลข</a>
          เพื่อจัดเรียงเป็นเลข 2 ตัว / 3 ตัว ครบทุกรูปแบบ
        </div>
      )}
    </>
  )
}
