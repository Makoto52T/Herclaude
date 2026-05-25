import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

function formatDate(ms) {
  const d = new Date(ms)
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function Articles({ apiBase, onError }) {
  const [loading, setLoading] = useState(true)
  const [articles, setArticles] = useState([])

  useEffect(() => {
    fetch(`${apiBase}/api/articles`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setArticles(d.articles || []))
      .catch((e) => onError && onError('โหลดบทความไม่สำเร็จ: ' + e.message))
      .finally(() => setLoading(false))
  }, [apiBase, onError])

  if (loading) return <div className="art-empty">กำลังโหลดบทความ...</div>

  if (articles.length === 0) {
    return (
      <div className="art-empty">
        <h2>📚 ยังไม่มีบทความ</h2>
        <p>บทความใหม่จะถูกสร้างอัตโนมัติทุกวันเวลา 00:00 น.</p>
      </div>
    )
  }

  return (
    <section className="articles-page">
      <div className="articles-intro">
        <h2>📚 บทความเกี่ยวกับหวย</h2>
        <p>รวมความรู้ เทคนิค และข่าวสารวงการหวย — อัพเดทใหม่ทุกวัน</p>
      </div>
      <div className="articles-list">
        {articles.map((a) => (
          <Link to={`/articles/${encodeURIComponent(a.slug)}`} className="article-card" key={a.id}>
            <div className="article-meta">
              <span className="article-date">{formatDate(a.created_at)}</span>
              {a.premium ? <span className="article-badge">PREMIUM</span> : null}
            </div>
            <h3 className="article-title">{a.title}</h3>
            {a.excerpt && <p className="article-excerpt">{a.excerpt}</p>}
            <span className="article-readmore">อ่านต่อ →</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
