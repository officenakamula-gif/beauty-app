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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!email || !password) { alert('メールアドレスとパスワードを入力してください'); return }
    if (mode === 'register' && !fullName) { alert('氏名を入力してください'); return }
    setLoading(true)
    try {
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            username: email,
            role,
            full_name: fullName,
            phone: phone || null,
            display_name: displayName || null,
          })
          alert('登録完了！確認メールをご確認ください。')
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        const { data: prof } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
        if (prof?.role === 'salon') router.push('/dashboard')
        else router.push('/')
      }
    } catch (err: any) {
      alert(err.message)
    }
    setLoading(false)
  }

  const gradStyle = {
    background: 'linear-gradient(45deg,#F77737,#E1306C,#833AB4,#5851DB)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  }

  const inputStyle = {
    width: '100%',
    border: '1.5px solid #DBDBDB',
    borderRadius: 10,
    padding: '11px 14px',
    fontSize: 14,
    fontFamily: 'inherit',
    outline: 'none',
    color: '#111',
    background: '#FAFAFA',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ background: 'white', borderBottom: '1px solid #DBDBDB', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ fontSize: 20, fontWeight: 700, textDecoration: 'none', ...gradStyle }}>Salon de Beauty</Link>
      </header>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 28, fontWeight: 700, ...gradStyle, marginBottom: 8 }}>Salon de Beauty</div>
            <div style={{ fontSize: 13, color: '#737373' }}>美容サロン予約サイト</div>
          </div>

          {/* Card */}
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #DBDBDB', padding: 28 }}>
            {/* Mode toggle */}
            <div style={{ display: 'flex', background: '#FAFAFA', borderRadius: 10, padding: 4, marginBottom: 24 }}>
              {(['login', 'register'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  style={{ flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 700, border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', background: mode === m ? 'linear-gradient(45deg,#F77737,#E1306C,#833AB4,#5851DB)' : 'transparent', color: mode === m ? 'white' : '#737373', transition: 'all 0.2s' }}>
                  {m === 'login' ? 'ログイン' : '新規登録'}
                </button>
              ))}
            </div>

            {/* Role toggle (register only) */}
            {mode === 'register' && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#737373', marginBottom: 8 }}>アカウント種別</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[{ key: 'user', label: '一般ユーザー' }, { key: 'salon', label: 'サロン' }].map(r => (
                    <button key={r.key} onClick={() => setRole(r.key as any)}
                      style={{ flex: 1, padding: '9px 0', fontSize: 13, fontWeight: 500, border: role === r.key ? 'none' : '1.5px solid #DBDBDB', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', background: role === r.key ? 'linear-gradient(135deg,#FFF0F5,#F5F0FF)' : 'white', color: role === r.key ? '#E1306C' : '#737373', boxShadow: role === r.key ? '0 0 0 1.5px #E1306C' : 'none', transition: 'all 0.15s' }}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 氏名（register only） */}
            {mode === 'register' && (
              <div style={{ marginBottom: 12 }}>
                <input
                  type="text"
                  placeholder="氏名（必須）"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  style={inputStyle}
                />
              </div>
            )}

            {/* 電話番号（register only） */}
            {mode === 'register' && (
              <div style={{ marginBottom: 12 }}>
                <input
                  type="tel"
                  placeholder="電話番号（例：090-1234-5678）"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  style={inputStyle}
                />
              </div>
            )}

            {/* 表示名（register only・任意） */}
            {mode === 'register' && (
              <div style={{ marginBottom: 12 }}>
                <input
                  type="text"
                  placeholder="表示名（任意）"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  style={inputStyle}
                />
                <div style={{ fontSize: 11, color: '#737373', marginTop: 4, paddingLeft: 4 }}>
                  未入力の場合は氏名が表示名として使われます
                </div>
              </div>
            )}

            {/* メールアドレス */}
            <div style={{ marginBottom: 12 }}>
              <input type="email" placeholder="メールアドレス" value={email} onChange={e => setEmail(e.target.value)}
                style={inputStyle} />
            </div>

            {/* パスワード */}
            <div style={{ marginBottom: 20 }}>
              <input type="password" placeholder="パスワード" value={password} onChange={e => setPassword(e.target.value)}
                style={inputStyle} />
            </div>

            <button onClick={handleSubmit} disabled={loading}
              style={{ width: '100%', background: 'linear-gradient(45deg,#F77737,#E1306C,#833AB4,#5851DB)', color: 'white', border: 'none', padding: 13, borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: loading ? 0.6 : 1 }}>
              {loading ? '処理中...' : mode === 'login' ? 'ログイン' : '登録する'}
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