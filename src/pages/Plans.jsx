import { useState } from 'react'

export default function Plans({ plans, apiBase, onError }) {
  const [checkoutLoading, setCheckoutLoading] = useState(null)

  const handleCheckout = async (planKey) => {
    setCheckoutLoading(planKey)
    try {
      const res = await fetch(`${apiBase}/api/checkout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        onError && onError('เกิดข้อผิดพลาด: ' + (data.error || 'unknown'))
        setCheckoutLoading(null)
      }
    } catch (err) {
      onError && onError('เชื่อมต่อไม่สำเร็จ: ' + err.message)
      setCheckoutLoading(null)
    }
  }

  return (
    <>
      <div className="plans-intro">
        <h2>✨ เลือกแพลนสมาชิกเพื่อเริ่มใช้งาน</h2>
        <p>ปลดล็อกระบบวินเลข + ทำนายฝัน — ใช้งานได้ไม่จำกัด</p>
      </div>
      <div className="plans-grid">
        {plans.map((p) => {
          const perMonth = Math.round(p.amount / p.months)
          const isYearly = p.key === 'yearly'
          const isHalf = p.key === 'halfyear'
          const includesDream = p.key === 'halfyear' || p.key === 'yearly'
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
                {includesDream ? (
                  <li className="feat-on">⭐ ระบบทำนายฝัน (Dream)</li>
                ) : (
                  <li className="feat-off">✗ ไม่รวมระบบทำนายฝัน</li>
                )}
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
    </>
  )
}
