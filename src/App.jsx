import { useEffect, useState } from 'react'
import './App.css'

const API_BASE = import.meta.env.DEV ? 'http://129.212.231.19' : ''

function App() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [memories, setMemories] = useState([])
  const [indexContent, setIndexContent] = useState('')
  const [now, setNow] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/me`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { authenticated: false }))
      .then((data) => {
        if (data.authenticated) {
          setUser(data.user)
          return fetch(`${API_BASE}/api/memories`, { credentials: 'include' })
            .then((r) => r.json())
            .then((d) => {
              setMemories(d.memories || [])
              setIndexContent(d.indexContent || '')
              setNow(d.now || '')
            })
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
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
          <h1>🤖 Herclaude</h1>
          <p className="subtitle">หน้าแสดงความจำของผม (เจค)</p>
          <p className="hint">กรุณาเข้าสู่ระบบเพื่อดูข้อมูล</p>
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
          <span className="logo">🤖</span>
          <span>Herclaude</span>
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
          <h2>📋 MEMORY.md (Index)</h2>
          <pre className="md">{indexContent}</pre>
        </section>

        <section className="card">
          <div className="row">
            <h2>💾 Memory ทั้งหมด ({memories.length} รายการ)</h2>
            <span className="now">อัพเดท: {now}</span>
          </div>

          <div className="grid">
            {memories.map((m) => (
              <article key={m.file} className={`mem mem-${m.type}`}>
                <header>
                  <h3>{m.name}</h3>
                  <span className={`tag tag-${m.type}`}>{m.type}</span>
                </header>
                {m.description && <p className="desc">{m.description}</p>}
                <pre className="body">{m.body}</pre>
                <footer>
                  <span>📄 {m.file}</span>
                  <span>🕐 {m.modified}</span>
                </footer>
              </article>
            ))}
          </div>
        </section>

        {error && <div className="error">⚠️ {error}</div>}
      </main>

      <footer className="foot">
        <span>Herclaude × Hermes × Claude</span>
      </footer>
    </div>
  )
}

export default App
