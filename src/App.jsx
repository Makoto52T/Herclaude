import { useEffect, useState } from 'react'
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import WinLek from './pages/WinLek.jsx'
import Dream from './pages/Dream.jsx'
import Plans from './pages/Plans.jsx'
import './App.css'

const API_BASE = import.meta.env.DEV ? 'http://129.212.231.19' : ''

function App() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [plans, setPlans] = useState([])
  const [banner, setBanner] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()

  useEffect(() => { setDrawerOpen(false) }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  const refreshMe = () => {
    return fetch(`${API_BASE}/api/me`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.user) {
          setUser(data.user)
          setSubscription(data.subscription || null)
        } else {
          setUser(null)
          setSubscription(null)
        }
      })
      .catch(() => {
        setUser(null)
        setSubscription(null)
      })
  }

  useEffect(() => {
    Promise.all([
      refreshMe(),
      fetch(`${API_BASE}/api/plans`)
        .then((r) => (r.ok ? r.json() : []))
        .then((d) => setPlans(Array.isArray(d) ? d : (d.plans || [])))
        .catch(() => setPlans([])),
    ]).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('checkout') === 'success') {
      setBanner({ type: 'success', text: 'ชำระเงินสำเร็จ! 🎉 กำลังอัพเดทสถานะ...' })
      const t = setTimeout(() => refreshMe(), 2000)
      window.history.replaceState({}, '', window.location.pathname)
      return () => clearTimeout(t)
    }
    if (params.get('checkout') === 'cancel') {
      setBanner({ type: 'info', text: 'ยกเลิกการชำระเงินแล้ว' })
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

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
          <h1>🎲 Herclaude</h1>
          <p className="subtitle">เครื่องมือวินเลข + ทำนายฝัน</p>
          <p className="hint">เข้าสู่ระบบเพื่อเริ่มใช้งาน</p>
          <a href={`${API_BASE}/auth/google`} className="btn-google">
            <span>🔐</span> เข้าสู่ระบบด้วย Google
          </a>
        </div>
      </div>
    )
  }

  const isAdmin = user.admin
  const hasPremium = isAdmin || (subscription && subscription.active && (subscription.plan === 'halfyear' || subscription.plan === 'yearly'))
  const hasAnyActive = isAdmin || (subscription && subscription.active)

  const planLabel = (p) => {
    if (p === 'admin') return 'ADMIN'
    if (p === 'monthly') return 'รายเดือน'
    if (p === 'halfyear') return 'ครึ่งปี'
    if (p === 'yearly') return 'รายปี'
    return p
  }

  return (
    <div className="app">
      <header className="topbar">
        <button
          type="button"
          className={'hamburger' + (drawerOpen ? ' open' : '')}
          onClick={() => setDrawerOpen((v) => !v)}
          aria-label="เปิดเมนู"
          aria-expanded={drawerOpen}
        >
          <span /><span /><span />
        </button>
        <div className="brand"><span className="logo">🎲</span> Herclaude</div>
        <div className="user">
          {user.photo && <img src={user.photo} alt="" />}
          <div className="meta">
            <div className="name">
              {user.name}
              {isAdmin && <span className="admin-badge">ADMIN</span>}
              {!isAdmin && hasAnyActive && <span className="plan-badge plan-badge-soft">{planLabel(subscription.plan)}</span>}
            </div>
            <div className="email">{user.email}</div>
          </div>
          <a href={`${API_BASE}/logout`} className="btn-logout" title="ออกจากระบบ">↩</a>
        </div>
      </header>

      <div
        className={'drawer-backdrop' + (drawerOpen ? ' show' : '')}
        onClick={() => setDrawerOpen(false)}
      />
      <aside className={'drawer' + (drawerOpen ? ' open' : '')}>
        <div className="drawer-head">
          <span className="drawer-title">เมนู</span>
          <button
            type="button"
            className="drawer-close"
            onClick={() => setDrawerOpen(false)}
            aria-label="ปิดเมนู"
          >×</button>
        </div>
        <nav className="drawer-nav">
          <NavLink to="/" end className={({ isActive }) => 'drawer-link' + (isActive ? ' active' : '')}>
            <span className="drawer-ic">🎲</span> วินเลข {!hasAnyActive && <span className="lock">🔒</span>}
          </NavLink>
          <NavLink to="/dream" className={({ isActive }) => 'drawer-link' + (isActive ? ' active' : '')}>
            <span className="drawer-ic">🌙</span> ทำนายฝัน {!hasPremium && <span className="lock">🔒</span>}
          </NavLink>
          {!isAdmin && (
            <NavLink to="/plans" className={({ isActive }) => 'drawer-link' + (isActive ? ' active' : '')}>
              <span className="drawer-ic">💎</span> แพลน
            </NavLink>
          )}
        </nav>
      </aside>

      {banner && (
        <div className={`banner banner-${banner.type}`}>
          <span>{banner.text}</span>
          <button onClick={() => setBanner(null)} className="banner-close">×</button>
        </div>
      )}

      <main className="content">
        <Routes>
          <Route path="/" element={hasAnyActive ? <WinLek /> : <Navigate to="/plans" replace />} />
          <Route path="/dream" element={hasAnyActive ? <Dream apiBase={API_BASE} hasAccess={hasPremium} /> : <Navigate to="/plans" replace />} />
          <Route path="/plans" element={<Plans plans={plans} apiBase={API_BASE} onError={(msg) => setBanner({ type: 'error', text: msg })} />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
