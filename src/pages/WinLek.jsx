import { useEffect, useMemo, useRef, useState, useCallback } from 'react'

function parseDigits(input) {
  const all = []
  for (const ch of input) {
    if (ch >= '0' && ch <= '9') all.push(ch)
  }
  return all
}

function multisetPermutations(arr, k) {
  if (k === 0) return [[]]
  if (arr.length < k) return []
  const out = []
  const used = new Set()
  for (let i = 0; i < arr.length; i++) {
    if (used.has(arr[i])) continue
    used.add(arr[i])
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)]
    for (const p of multisetPermutations(rest, k - 1)) {
      out.push([arr[i], ...p])
    }
  }
  return out
}

const allSame = (p) => p.every((d) => d === p[0])

function applyFilters(list, startF, endF, containsF) {
  return list.filter((n) => {
    if (startF && !n.startsWith(startF)) return false
    if (endF && !n.endsWith(endF)) return false
    if (containsF && !n.includes(containsF)) return false
    return true
  })
}

export default function WinLek({ apiBase = '' }) {
  const [input, setInput] = useState('')
  const inputRef = useRef(null)

  const [startFilter, setStartFilter] = useState('')
  const [endFilter, setEndFilter] = useState('')
  const [containsFilter, setContainsFilter] = useState('')
  const [copied, setCopied] = useState(null)

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus()
  }, [])

  const digits = useMemo(() => parseDigits(input), [input])

  const { twoNoDouble, twoWithDouble, threeNoTriple, threeWithTriple } = useMemo(() => {
    if (digits.length === 0) {
      return { twoNoDouble: [], twoWithDouble: [], threeNoTriple: [], threeWithTriple: [] }
    }
    const perm2 = multisetPermutations(digits, 2).map((p) => ({ str: p.join(''), arr: p }))
    const perm3 = multisetPermutations(digits, 3).map((p) => ({ str: p.join(''), arr: p }))
    const sortStr = (a, b) => a.localeCompare(b)

    const twoPermStrs = perm2.map((x) => x.str)
    const threePermStrs = perm3.map((x) => x.str)
    const uniqueDigits = [...new Set(digits)]
    const doubles = uniqueDigits.map((d) => d.repeat(2))
    const triples = uniqueDigits.map((d) => d.repeat(3))
    const withDoubleSet = new Set([...twoPermStrs, ...doubles])
    const withTripleSet = new Set([...threePermStrs, ...triples])

    return {
      twoNoDouble: perm2.filter(({ arr }) => !allSame(arr)).map((x) => x.str).sort(sortStr),
      twoWithDouble: [...withDoubleSet].sort(sortStr),
      threeNoTriple: perm3.filter(({ arr }) => !allSame(arr)).map((x) => x.str).sort(sortStr),
      threeWithTriple: [...withTripleSet].sort(sortStr),
    }
  }, [digits])

  const trackNumber = useCallback((number) => {
    fetch(`${apiBase}/api/hot/track`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number, draw_type: 'all' }),
    }).catch(() => {})
  }, [apiBase])

  const copyChip = (n) => {
    navigator.clipboard.writeText(n)
    trackNumber(n)
    setCopied(n)
    setTimeout(() => setCopied(null), 1200)
  }

  const copyAll = (list) => {
    navigator.clipboard.writeText(list.join(' '))
    list.forEach((n) => trackNumber(n))
  }

  const hasFilter = startFilter || endFilter || containsFilter
  const clearFilters = () => { setStartFilter(''); setEndFilter(''); setContainsFilter('') }

  const rawOutputs = [
    { title: 'เลข 2 ตัว (ไม่รวมเบิ้ล)', icon: '2️⃣', list: twoNoDouble },
    { title: 'เลข 2 ตัว (รวมเบิ้ล)', icon: '2️⃣', list: twoWithDouble },
    { title: 'เลข 3 ตัว (ไม่รวมตอง)', icon: '3️⃣', list: threeNoTriple },
    { title: 'เลข 3 ตัว (รวมตอง)', icon: '3️⃣', list: threeWithTriple },
  ]

  const outputs = rawOutputs.map((out) => ({
    ...out,
    list: hasFilter ? applyFilters(out.list, startFilter, endFilter, containsFilter) : out.list,
  }))

  return (
    <>
      <section className="input-card">
        <input
          ref={inputRef}
          className="num-input"
          type="text"
          inputMode="numeric"
          placeholder="พิมพ์เลขที่นี่ เช่น 1234 หรือ 336"
          value={input}
          onChange={(e) => setInput(e.target.value.replace(/\D/g, ''))}
          maxLength={10}
          autoFocus
        />
        <div className="digit-info">
          {digits.length > 0
            ? `เลขที่ใช้: ${digits.join(' ')} (${digits.length} ตัว)`
            : 'พิมพ์เลขเพื่อเริ่มวิน — ใส่เลขซ้ำได้เพื่อเปิดโอกาสเบิ้ล/ตอง'}
        </div>
      </section>

      {digits.length > 0 && (
        <div className="winlek-filter">
          <label>กรอง:</label>
          <input
            className="winlek-filter-input"
            type="text"
            inputMode="numeric"
            placeholder="ขึ้นต้น"
            value={startFilter}
            onChange={(e) => setStartFilter(e.target.value.replace(/\D/g, '').slice(0, 2))}
            maxLength={2}
          />
          <input
            className="winlek-filter-input"
            type="text"
            inputMode="numeric"
            placeholder="ลงท้าย"
            value={endFilter}
            onChange={(e) => setEndFilter(e.target.value.replace(/\D/g, '').slice(0, 2))}
            maxLength={2}
          />
          <input
            className="winlek-filter-input"
            type="text"
            inputMode="numeric"
            placeholder="มีเลข"
            value={containsFilter}
            onChange={(e) => setContainsFilter(e.target.value.replace(/\D/g, '').slice(0, 1))}
            maxLength={1}
          />
          {hasFilter && (
            <button className="winlek-filter-clear" onClick={clearFilters}>ล้าง</button>
          )}
        </div>
      )}

      <section className="outputs-grid">
        {outputs.map((out) => (
          <div className="output-card" key={out.title}>
            <div className="output-head">
              <h3>
                <span className="ic">{out.icon}</span> {out.title}
              </h3>
              <div className="head-right">
                <span className="count">{out.list.length}</span>
                {out.list.length > 0 && (
                  <button className="btn-copy" onClick={() => copyAll(out.list)} title="คัดลอกทั้งหมด">
                    📋
                  </button>
                )}
              </div>
            </div>
            <div className="num-grid">
              {out.list.length === 0 ? (
                <span className="empty">—</span>
              ) : (
                out.list.map((n) => (
                  <span
                    key={n}
                    className={`num-chip${copied === n ? ' copied' : ''}`}
                    onClick={() => copyChip(n)}
                    title="แตะเพื่อคัดลอก"
                    style={{ cursor: 'pointer' }}
                  >
                    {copied === n ? '✓' : n}
                  </span>
                ))
              )}
            </div>
          </div>
        ))}
      </section>
    </>
  )
}
