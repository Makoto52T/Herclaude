import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const API_BASE = import.meta.env.DEV ? 'http://129.212.231.19' : ''

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

function formatExpiry(epochSeconds) {
  if (!epochSeconds) return ''
  const d = new Date(epochSeconds * 1000)
  return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
}

function App() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [plans, setPlans] = useState([])
  const [checkoutLoading, setCheckoutLoading] = useState(null)
  const [banner, setBanner] = useState(null)

  const [input, setInput] = useState('')
  const inputRef = useRef(null)

  const refreshMe = () => {
    return fetch(`${API_BASE}/api/me`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { authenticated: false }))
      .then((data) => {
        if (data.authenticated) {
          setUser(data.user)
          setSubscription(data.subscription)
        } else {
          setUser(null)
          setSubscription(null)
        }
      })
      .catch(() => {})
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('checkout') === 'success') {
      setBanner({ type: 'success', text: '✅ ชำระเงินสำเร็จ! บัญชีของคุณเป็นสมาชิกแล้ว' })
      window.history.replaceState({}, '', window.location.pathname)
    } else if (params.get('checkout') === 'cancel') {
      setBanner({ type: 'info', text: 'ยกเลิกการชำระเงินแล้ว' })
      window.history.replaceState({}, '', window.location.pathname)
    }

    refreshMe().finally(() => setLoading(false))
    fetch(`${API_BASE}/api/plans`).then((r) => r.json()).then(setPlans).catch(() => {})
  }, [])

  const isActive = subscription && subscription.active
  const showWinLek = user && isActive

  useEffect(() => {
    if (showWinLek && inputRef.current) {
      inputRef.current.focus()
    }
  }, [showWinLek])

  const handleCheckout = async (planKey) => {
    setCheckoutLoading(planKey)
    try {
      const res = await fetch(`${API_BASE}/api/checkout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setBanner({ type: 'error', text: 'เกิดข้อผิดพลาด: ' + (data.error || 'unknown') })
        setCheckoutLoading(null)
      }
    } catch (err) {
      setBanner({ type: 'error', text: 'เชื่อมต่อไม่สำเร็จ: ' + err.message })
      setCheckoutLoading(null)
    }
  }

  const handlePortal = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/billing-portal`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch (err) {
      setBanner({ type: 'error', text: 'เปิด billing portal ไม่สำเร็จ' })
    }
  }

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

  if (!isActive) {
    return (
      <div className="app">
        <header className="topbar">
          <div className="brand">
            <span className="logo">🎰</span>
            <span>Herclaude · เลือกแพลน</span>
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

        <main className="content plans-content">
          {banner && (
            <div className={`banner banner-${banner.type}`}>{banner.text}</div>
          )}
          <div className="plans-intro">
            <h2>✨ เลือกแพลนสมาชิกเพื่อเริ่มใช้งาน</h2>
            <p>ปลดล็อกระบบวินเลข — ใช้งานได้ไม่จำกัด</p>
          </div>
          <div className="plans-grid">
            {plans.map((p) => {
              const perMonth = Math.round(p.amount / p.months)
              const isYearly = p.key === 'yearly'
              const isHalf = p.key === 'halfyear'
              return (
                <div className={`plan-card ${isYearly ? 'plan-featured' : ''}`} key={p.key}>
                  {isYearly && <div className="plan-badge">คุ้มที่สุด 🔥</div>}
                  {isHalf && <div className="plan-badge plan-badge-soft">ยอดนิยม</div>}
                  <h3 className="plan-name">{p.label}</h3>
                  <div className="plan-price">
                    <span className="amount">{p.amount}</span>
                    <span className="currency">บาท</span>
                  </div>
                  <div className="plan-permonth">
                    {p.months > 1 ? `เฉลี่ย ${perMonth} บาท/เดือน` : 'ต่อเดือน'}
                  </div>
                  <ul className="plan-features">
                    <li>✓ ใช้ระบบวินเลขไม่จำกัด</li>
                    <li>✓ เลข 2 ตัว / 3 ตัว ครบทุกแบบ</li>
                    <li>✓ รวมเบิ้ล/ตอง อัตโนมัติ</li>
                    <li>✓ คัดลอกผลลัพธ์ในคลิกเดียว</li>
                  </ul>
                  <button
                    className="btn-subscribe"
                    onClick={() => handleCheckout(p.key)}
                    disabled={checkoutLoading !== null}
                  >
                    {checkoutLoading === p.key ? 'กำลังเปิดหน้าชำระเงิน...' : 'สมัครเลย'}
                  </button>
                </div>
              )
            })}
          </div>
          <p className="plans-foot">
            ชำระเงินผ่าน Stripe ปลอดภัย · ยกเลิกเมื่อไหร่ก็ได้
          </p>
        </main>
      </div>
    )
  }

  const outputs = [
    { title: 'เลข 2 ตัว (ไม่รวมเบิ้ล)', icon: '2️⃣', list: twoNoDouble },
    { title: 'เลข 2 ตัว (รวมเบิ้ล)', icon: '2️⃣', list: twoWithDouble },
    { title: 'เลข 3 ตัว (ไม่รวมตอง)', icon: '3️⃣', list: threeNoTriple },
    { title: 'เลข 3 ตัว (รวมตอง)', icon: '3️⃣', list: threeWithTriple },
  ]

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
            <span className="name">
              {user.name}
              {user.admin && <span className="admin-badge">ADMIN</span>}
            </span>
            <span className="email">
              {user.email}
              {subscription && subscription.current_period_end && (
                <span className="sub-info"> · ต่ออายุ {formatExpiry(subscription.current_period_end)}</span>
              )}
            </span>
          </div>
          {!user.admin && <button className="btn-portal" onClick={handlePortal}>จัดการสมาชิก</button>}
          <a className="btn-logout" href={`${API_BASE}/logout`}>ออกจากระบบ</a>
        </div>
      </header>

      <main className="content">
        {banner && <div className={`banner banner-${banner.type}`}>{banner.text}</div>}
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
                    <span key={n} className="num-chip">{n}</span>
                  ))
                )}
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  )
}

export default App
