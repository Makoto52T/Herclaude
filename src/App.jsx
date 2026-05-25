import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE = import.meta.env.DEV ? 'http://129.212.231.19' : ''

function uniqueDigits(input) {
  const seen = new Set()
  const out = []
  for (const ch of input) {
    if (ch >= '0' && ch <= '9' && !seen.has(ch)) {
      seen.add(ch)
      out.push(ch)
    }
  }
  return out
}

function permutations(arr, k) {
  if (k === 0) return [[]]
  if (arr.length < k) return []
  const out = []
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)]
    for (const p of permutations(rest, k - 1)) {
      out.push([arr[i], ...p])
    }
  }
  return out
}

function App() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  const [input, setInput] = useState('')
  const [includeDoubles, setIncludeDoubles] = useState(false)

  useEffect(() => {
    fetch(`${API_BASE}/api/me`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { authenticated: false }))
      .then((data) => {
        if (data.authenticated) setUser(data.user)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const digits = useMemo(() => uniqueDigits(input), [input])

  const two = useMemo(() => {
    if (digits.length < 1) return []
    const perms = permutations(digits, 2).map((p) => p.join(''))
    if (includeDoubles) {
      const doubles = digits.map((d) => d + d)
      return [...perms, ...doubles].sort()
    }
    return perms.sort()
  }, [digits, includeDoubles])

  const three = useMemo(() => {
    if (digits.length < 1) return []
    const perms = permutations(digits, 3).map((p) => p.join(''))
    if (includeDoubles) {
      const extras = []
      for (const a of digits) {
        for (const b of digits) {
          if (a === b) continue
          extras.push(a + a + b)
          extras.push(a + b + b)
          extras.push(b + a + a)
        }
        extras.push(a + a + a)
      }
      const all = new Set([...perms, ...extras])
      return [...all].sort()
    }
    return perms.sort()
  }, [digits, includeDoubles])

  const copyAll = (list) => {
    navigator.clipboard.writeText(list.join(' '))
  }

  if (loading) {
    return (
      <div className="center-screen">
        <div className="spinner" />
        <p>กำลังโหลด...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="center-screen">
        <div className="login-card">
          <h1>🎰 Herclaude</h1>
          <p className="subtitle">เครื่องมือวินเลข</p>
          <p className="hint">กรุณาเข้าสู่ระบบเพื่อใช้งาน</p>
          <a className="btn-google" href={`${API_BASE}/auth/google`}>
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3c-2 1.5-4.5 2.5-7.3 2.5-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.3C41.4 35 44 30 44 24c0-1.3-.1-2.3-.4-3.5z"/>
            </svg>
            ล็อกอินด้วย Google
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">🎰</span>
          <span>Herclaude · วินเลข</span>
        </div>
        <div className="user">
          {user.picture && <img src={user.picture} alt="" referrerPolicy="no-referrer" />}
          <div className="meta">
            <span className="name">{user.name}</span>
            <span className="email">{user.email}</span>
          </div>
          <a className="btn-logout" href={`${API_BASE}/logout`}>ออกจากระบบ</a>
        </div>
      </header>

      <main className="content">
        <section className="card">
          <h2>🔢 ใส่ชุดเลข</h2>
          <p className="desc">พิมพ์ตัวเลขที่ต้องการวิน (ตัวซ้ำจะถูกตัดออกอัตโนมัติ)</p>
          <input
            className="num-input"
            type="text"
            inputMode="numeric"
            placeholder="เช่น 1234"
            value={input}
            onChange={(e) => setInput(e.target.value.replace(/\D/g, ''))}
            maxLength={10}
          />
          <div className="opts">
            <label className="check">
              <input
                type="checkbox"
                checked={includeDoubles}
                onChange={(e) => setIncludeDoubles(e.target.checked)}
              />
              <span>รวมเลขเบิ้ล/ตอง (เช่น 11, 22, 111)</span>
            </label>
            <span className="digit-info">
              {digits.length > 0
                ? `เลขที่ใช้: ${digits.join(', ')} (${digits.length} ตัว)`
                : 'ยังไม่มีเลข'}
            </span>
          </div>
        </section>

        {digits.length > 0 && (
          <>
            <section className="card">
              <div className="row">
                <h2>2️⃣ เลข 2 ตัว ({two.length} ตัว)</h2>
                <button className="btn-copy" onClick={() => copyAll(two)}>
                  📋 คัดลอกทั้งหมด
                </button>
              </div>
              <div className="num-grid">
                {two.map((n) => (
                  <span key={n} className="num-chip">{n}</span>
                ))}
              </div>
            </section>

            <section className="card">
              <div className="row">
                <h2>3️⃣ เลข 3 ตัว ({three.length} ตัว)</h2>
                <button className="btn-copy" onClick={() => copyAll(three)}>
                  📋 คัดลอกทั้งหมด
                </button>
              </div>
              <div className="num-grid">
                {three.map((n) => (
                  <span key={n} className="num-chip">{n}</span>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="foot">
        <span>Herclaude × Hermes × Claude</span>
      </footer>
    </div>
  )
}

export default App
