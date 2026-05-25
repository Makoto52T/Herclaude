import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

function formatDate(ms) {
  const d = new Date(ms)
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
}

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return <strong key={i}>{p.slice(2, -2)}</strong>
    }
    return <span key={i}>{p}</span>
  })
}

function renderMarkdown(md) {
  const lines = md.split('\n')
  const blocks = []
  let i = 0
  while (i < lines.length) {
    const ln = lines[i]
    if (/^#\s+/.test(ln)) {
      blocks.push(<h1 key={i}>{renderInline(ln.replace(/^#\s+/, ''))}</h1>)
      i++
    } else if (/^##\s+/.test(ln)) {
      blocks.push(<h2 key={i}>{renderInline(ln.replace(/^##\s+/, ''))}</h2>)
      i++
    } else if (/^###\s+/.test(ln)) {
      blocks.push(<h3 key={i}>{renderInline(ln.replace(/^###\s+/, ''))}</h3>)
      i++
    } else if (/^[-*]\s+/.test(ln)) {
      const items = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(<li key={i}>{renderInline(lines[i].replace(/^[-*]\s+/, ''))}</li>)
        i++
      }
      blocks.push(<ul key={'ul' + i}>{items}</ul>)
    } else if (/^\d+\.\s+/.test(ln)) {
      const items = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(<li key={i}>{renderInline(lines[i].replace(/^\d+\.\s+/, ''))}</li>)
        i++
      }
      blocks.push(<ol key={'ol' + i}>{items}</ol>)
    } else if (ln.trim() === '') {
      i++
    } else {
      blocks.push(<p key={i}>{renderInline(ln)}</p>)
      i++
    }
  }
  return blocks
}

export default function ArticleDetail({ apiBase, onError }) {
  const { slug } = useParams()
  const [loading, setLoading] = useState(true)
  const [article, setArticle] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    fetch(`${apiBase}/api/articles/${encodeURIComponent(slug)}`, { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json().catch(() => ({}))
          if (r.status === 402) {
            setError({ type: 'paywall', article: data.article })
          } else if (r.status === 404) {
            setError({ type: 'notfound' })
          } else {
            setError({ type: 'other', message: data.error || 'ไม่ทราบสาเหตุ' })
          }
          return null
        }
        return r.json()
      })
      .then((d) => { if (d) setArticle(d.article) })
      .catch((e) => onError && onError('โหลดบทความไม่สำเร็จ: ' + e.message))
      .finally(() => setLoading(false))
  }, [slug, apiBase, onError])

  if (loading) return <div className="art-empty">กำลังโหลด...</div>

  if (error?.type === 'paywall') {
    return (
      <section className="article-page">
        <Link to="/articles" className="article-back">← กลับ</Link>
        <article className="article-detail">
          <h1>{error.article?.title || 'บทความ Premium'}</h1>
          <p className="article-excerpt">{error.article?.excerpt}</p>
          <div className="paywall">
            <p>🔒 บทความนี้สำหรับสมาชิกเท่านั้น</p>
            <Link to="/plans" className="btn-subscribe" style={{ display: 'inline-block', textAlign: 'center', textDecoration: 'none' }}>
              ดูแพ็กเกจสมาชิก
            </Link>
          </div>
        </article>
      </section>
    )
  }

  if (error?.type === 'notfound') {
    return (
      <div className="art-empty">
        <h2>ไม่พบบทความนี้</h2>
        <Link to="/articles" className="article-back">← กลับไปหน้ารวมบทความ</Link>
      </div>
    )
  }

  if (error) {
    return <div className="art-empty"><p>เกิดข้อผิดพลาด: {error.message}</p></div>
  }

  if (!article) return null

  return (
    <section className="article-page">
      <Link to="/articles" className="article-back">← กลับ</Link>
      <article className="article-detail">
        <div className="article-meta">
          <span className="article-date">{formatDate(article.created_at)}</span>
          {article.premium ? <span className="article-badge">PREMIUM</span> : null}
        </div>
        <h1>{article.title}</h1>
        {article.excerpt && <p className="article-excerpt-lead">{article.excerpt}</p>}
        <div className="article-body">{renderMarkdown(article.content)}</div>
      </article>
    </section>
  )
}
