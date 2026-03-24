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

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://beauty-app-mhst.vercel.app/auth/callback'
      }
    })
  }

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
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role,
              full_name: role === 'user' ? fullName : representativeName,
              salon_name: role === 'salon' ? salonName : null,
            }
          }
        })
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
            }, { onConflict: 'id' })
            alert('確認メールを送信しました。\nメール内のリンクをクリックして登録を完了してください。')
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
            }, { onConflict: 'id' })
            // 既にsalonが作られていない場合のみinsert
            const { data: existingSalon } = await supabase
              .from('salons').select('id').eq('owner_id', data.user.id).maybeSingle()
            if (!existingSalon) {
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
            }
            alert('確認メールを送信しました。\nメール内のリンクをクリックして登録を完了してください。\n\n※認証後はダッシュボードからサロン情報を入力しておいてください。\n管理者審査後に掲載が開始されます。')
            router.push('/')
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

            {/* Googleログイン（ユーザーのみ） */}
            {(mode === 'login' || role === 'user') && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' }}>
                  <div style={{ flex: 1, height: 1, background: '#DBDBDB' }} />
                  <span style={{ fontSize: 11, color: '#737373' }}>または</span>
                  <div style={{ flex: 1, height: 1, background: '#DBDBDB' }} />
                </div>
                <button onClick={handleGoogleLogin}
                  style={{ width: '100%', background: 'white', color: '#262626', border: '1.5px solid #DBDBDB', padding: 12, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                  Googleで{mode === 'login' ? 'ログイン' : '登録'}
                </button>
              </>
            )}
          </div>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <Link href="/" style={{ fontSize: 13, color: '#737373', textDecoration: 'none' }}>トップページに戻る</Link>
          </div>
        </div>
      </div>
    </div>
  )
}