'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [role, setRole] = useState<'user' | 'salon'>('user')

  // 共通
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // ユーザー登録
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [displayName, setDisplayName] = useState('')

  // サロン登録
  const [salonName, setSalonName] = useState('')
  const [salonPhone, setSalonPhone] = useState('')
  const [representativeName, setRepresentativeName] = useState('')
  const [businessType, setBusinessType] = useState<'individual' | 'corporate'>('individual')
  const [agreed, setAgreed] = useState(false)

  const handleSubmit = async () => {
    if (!email || !password) { alert('メールアドレスとパスワードを入力してください'); return }

    if (mode === 'register') {
      if (role === 'user' && !fullName) { alert('氏名を入力してください'); return }
      if (role === 'salon') {
        if (!salonName) { alert('サロン名を入力してください'); return }
        if (!salonPhone) { alert('サロンの電話番号を入力してください'); return }
        if (!representativeName) { alert('担当者名を入力してください'); return }
        if (!agreed) { alert('利用規約に同意してください'); return }
      }
    }

    setLoading(true)
    try {
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (data.user) {
          if (role === 'user') {
            await supabase.from('profiles').upsert({
              id: data.user.id,
              username: email,
              role,
              full_name: fullName,
              phone: phone || null,
              display_name: displayName || null,
            })
            alert('登録完了！確認メールをご確認ください。')
            router.push('/')
          } else {
            // サロン → 承認待ちで仮登録
            await supabase.from('profiles').upsert({
              id: data.user.id,
              username: email,
              role,
              full_name: representativeName,
              salon_name: salonName,
              salon_phone: salonPhone,
              representative_name: representativeName,
              business_type: businessType,
            })
            await supabase.from('salons').insert({
              owner_id: data.user.id,
              name: salonName,
              phone: salonPhone,
              genre: 'ヘアサロン',
              area: '',
              address: '',
              is_active: false,
              status: 'pending',
            })
            alert('申請を受け付けました！\n\n管理者が内容を確認後、掲載を承認します。\n承認されるとメールでご連絡します。\n\nそれまでの間、ダッシュボードからサロン情報を入力しておいてください。')
            router.push('/dashboard')
          }
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        const { data: prof } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
        if (prof?.role === 'admin') router.push('/admin')
        else if (prof?.role === 'salon') router.push('/dashboard')
        else router.push('/')
      }
    } catch (err: any) {
      alert(err.message)
    }
    setLoading(false)
  }

  const gradStyle: any = {
    background: 'linear-gradient(45deg,#F77737,#E1306C,#833AB4,#5851DB)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  }

  const inputStyle: any = {
    width: '100%',
    border: '1.5px solid #DBDBDB',
    borderRadius: 10,
    padding: '11px 14px',
    fontSize: 13,
    fontFamily: 'inherit',
    outline: 'none',
    color: '#111',
    background: '#FAFAFA',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA', display: 'flex', flexDirection: 'column' }}>
      <header style={{ background: 'white', borderBottom: '1px solid #DBDBDB', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center' }}>
        <Link href="/" style={{ fontSize: 20, fontWeight: 700, textDecoration: 'none', ...gradStyle }}>Salon de Beauty</Link>
      </header>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ width: '100%', maxWidth: 440 }}>

          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 26, fontWeight: 700, ...gradStyle, marginBottom: 6 }}>Salon de Beauty</div>
            <div style={{ fontSize: 13, color: '#737373' }}>美容サロン予約サイト</div>
          </div>

          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #DBDBDB', padding: 28 }}>

            {/* モード切替 */}
            <div style={{ display: 'flex', background: '#FAFAFA', borderRadius: 10, padding: 4, marginBottom: 24 }}>
              {(['login', 'register'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  style={{ flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 700, border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', background: mode === m ? 'linear-gradient(45deg,#F77737,#E1306C,#833AB4,#5851DB)' : 'transparent', color: mode === m ? 'white' : '#737373', transition: 'all 0.2s' }}>
                  {m === 'login' ? 'ログイン' : '新規登録'}
                </button>
              ))}
            </div>

            {/* アカウント種別 */}
            {mode === 'register' && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#737373', marginBottom: 8 }}>アカウント種別</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[{ key: 'user', label: '一般ユーザー' }, { key: 'salon', label: 'サロン掲載' }].map(r => (
                    <button key={r.key} onClick={() => setRole(r.key as any)}
                      style={{ flex: 1, padding: '9px 0', fontSize: 13, fontWeight: 500, border: role === r.key ? 'none' : '1.5px solid #DBDBDB', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', background: role === r.key ? 'linear-gradient(135deg,#FFF0F5,#F5F0FF)' : 'white', color: role === r.key ? '#E1306C' : '#737373', boxShadow: role === r.key ? '0 0 0 1.5px #E1306C' : 'none', transition: 'all 0.15s' }}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── ユーザー登録フィールド ── */}
            {mode === 'register' && role === 'user' && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <input type="text" placeholder="氏名（必須）" value={fullName} onChange={e => setFullName(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <input type="tel" placeholder="電話番号（例：090-1234-5678）" value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <input type="text" placeholder="表示名（任意）" value={displayName} onChange={e => setDisplayName(e.target.value)} style={inputStyle} />
                  <div style={{ fontSize: 11, color: '#737373', marginTop: 4, paddingLeft: 2 }}>未入力の場合は氏名が使われます</div>
                </div>
              </>
            )}

            {/* ── サロン登録フィールド ── */}
            {mode === 'register' && role === 'salon' && (
              <>
                <div style={{ background: '#FFF8E1', border: '1px solid #FFE082', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 12, color: '#7A5800', lineHeight: 1.7 }}>
                  サロン掲載は管理者による審査があります。<br />
                  申請後、通常1〜3営業日以内に審査結果をメールでご連絡します。
                </div>

                <div style={{ fontSize: 11, fontWeight: 700, color: '#737373', letterSpacing: '0.08em', marginBottom: 8 }}>サロン情報</div>
                <div style={{ marginBottom: 12 }}>
                  <input type="text" placeholder="サロン名（必須）" value={salonName} onChange={e => setSalonName(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <input type="tel" placeholder="サロンの電話番号（必須）" value={salonPhone} onChange={e => setSalonPhone(e.target.value)} style={inputStyle} />
                </div>

                <div style={{ fontSize: 11, fontWeight: 700, color: '#737373', letterSpacing: '0.08em', marginBottom: 8 }}>担当者情報</div>
                <div style={{ marginBottom: 12 }}>
                  <input type="text" placeholder="担当者名（必須）" value={representativeName} onChange={e => setRepresentativeName(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#737373', marginBottom: 8 }}>事業者区分</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[{ key: 'individual', label: '個人' }, { key: 'corporate', label: '法人' }].map(b => (
                      <button key={b.key} onClick={() => setBusinessType(b.key as any)}
                        style={{ flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 500, border: businessType === b.key ? 'none' : '1.5px solid #DBDBDB', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', background: businessType === b.key ? 'linear-gradient(135deg,#FFF0F5,#F5F0FF)' : 'white', color: businessType === b.key ? '#E1306C' : '#737373', boxShadow: businessType === b.key ? '0 0 0 1.5px #E1306C' : 'none' }}>
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 利用規約同意 */}
                <div style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <input type="checkbox" id="agree" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                    style={{ marginTop: 3, width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }} />
                  <label htmlFor="agree" style={{ fontSize: 12, color: '#555', lineHeight: 1.7, cursor: 'pointer' }}>
                    <span style={{ color: '#833AB4', fontWeight: 700 }}>利用規約</span>および
                    <span style={{ color: '#833AB4', fontWeight: 700 }}>プライバシーポリシー</span>
                    に同意します。スパム・いたずら掲載が確認された場合は即時削除・利用停止となります。
                  </label>
                </div>
              </>
            )}

            {/* メールアドレス */}
            <div style={{ marginBottom: 12 }}>
              <input type="email" placeholder="メールアドレス" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
            </div>

            {/* パスワード */}
            <div style={{ marginBottom: 20 }}>
              <input type="password" placeholder={mode === 'register' ? 'パスワード（8文字以上）' : 'パスワード'} value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
            </div>

            <button onClick={handleSubmit} disabled={loading}
              style={{ width: '100%', background: 'linear-gradient(45deg,#F77737,#E1306C,#833AB4,#5851DB)', color: 'white', border: 'none', padding: 13, borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: loading ? 0.6 : 1 }}>
              {loading ? '処理中...' : mode === 'login' ? 'ログイン' : role === 'salon' ? '掲載を申請する' : '登録する'}
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <Link href="/" style={{ fontSize: 13, color: '#737373', textDecoration: 'none' }}>トップページに戻る</Link>
          </div>
        </div>
      </div>
    </div>
  )
}