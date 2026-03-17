'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { REGIONS } from '@/lib/areas'

const GENRES = [
  { key: 'ヘアサロン', label: 'ヘアサロン' },
  { key: 'ネイル・まつげ', label: 'ネイル・まつげ' },
  { key: 'リラク・エステ', label: 'リラク・エステ' },
]

export default function HomePage() {
  const [profile, setProfile] = useState<any>(null)
  const [salons, setSalons] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [selectedRegion, setSelectedRegion] = useState('')
  const [selectedPref, setSelectedPref] = useState('')
  const [selectedArea, setSelectedArea] = useState('')
  const [genre, setGenre] = useState('ヘアサロン')
  const [user, setUser] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user)
      if (data.user) {
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
        setProfile(prof)
        if (prof?.role === 'salon') router.push('/dashboard')
      }
    })
  }, [])

  useEffect(() => { fetchSalons() }, [search, selectedArea, genre])

  const fetchSalons = async () => {
    let query = supabase.from('salons').select('*').eq('is_active', true)
    if (search) query = query.ilike('name', `%${search}%`)
    if (selectedArea) query = query.eq('area', selectedArea)
    if (genre) query = query.eq('genre', genre)
    const { data } = await query.order('created_at', { ascending: false })
    setSalons(data || [])
  }

  const handleLogin = async () => {
    if (!email || !password) return
    setLoginLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
      setProfile(prof)
      setUser(data.user)
      if (prof?.role === 'salon') router.push('/dashboard')
    } catch (err: any) {
      alert(err.message)
    }
    setLoginLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const selectArea = (area: string) => {
    setSelectedArea(area)
  }

  const clearArea = () => {
    setSelectedRegion('')
    setSelectedPref('')
    setSelectedArea('')
  }

  const s: any = {
    header: {
      background: 'white',
      borderBottom: '1px solid #DBDBDB',
      padding: '0 32px',
      height: 56,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky' as const,
      top: 0,
      zIndex: 100,
    },
    logo: {
      fontSize: 20,
      fontWeight: 700,
      background: 'linear-gradient(45deg, #F77737, #E1306C, #833AB4, #5851DB)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      letterSpacing: '-0.5px',
    },
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA' }}>
      {/* Header */}
      <header style={s.header}>
        <div style={s.logo}>Salon de Beauty</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user ? (
            <>
              {profile?.role === 'salon' && (
                <button onClick={() => router.push('/dashboard')} style={{ background: 'linear-gradient(45deg,#F77737,#E1306C,#833AB4)', color: 'white', border: 'none', padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  管理画面
                </button>
              )}
              <Link href="/mypage" style={{ fontSize: 12, color: '#737373', textDecoration: 'none', fontWeight: 500 }}>マイページ</Link>
              <button onClick={handleLogout} style={{ fontSize: 12, border: '1.5px solid #DBDBDB', background: 'none', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', color: '#262626' }}>ログアウト</button>
            </>
          ) : (
            <Link href="/auth" style={{ background: 'linear-gradient(45deg,#F77737,#E1306C,#833AB4,#5851DB)', color: 'white', padding: '7px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
              ログイン
            </Link>
          )}
        </div>
      </header>

      {/* Genre tabs */}
      <div style={{ background: 'white', borderBottom: '1px solid #DBDBDB', padding: '0 32px', display: 'flex' }}>
        {GENRES.map(g => (
          <button key={g.key} onClick={() => setGenre(g.key)}
            style={{ padding: '12px 20px', fontSize: 13, fontWeight: 500, border: 'none', borderBottom: genre === g.key ? '2px solid #E1306C' : '2px solid transparent', background: 'none', cursor: 'pointer', color: genre === g.key ? '#111' : '#737373', fontFamily: 'inherit', transition: 'all 0.2s' }}>
            {g.label}
          </button>
        ))}
      </div>

      {/* Main layout */}
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '24px 32px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: 28 }}>

        {/* Left column */}
        <div>
          {/* Hero search */}
          <div style={{ background: 'linear-gradient(45deg,#F77737,#E1306C,#833AB4,#5851DB)', borderRadius: 16, padding: '28px 32px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'white', marginBottom: 4 }}>美容サロンを探す</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 20 }}>Find your perfect beauty salon</div>
            <div style={{ display: 'flex', gap: 8, background: 'white', borderRadius: 10, padding: '4px 4px 4px 16px', alignItems: 'center' }}>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="サロン名・キーワードで検索"
                style={{ flex: 1, border: 'none', fontSize: 13, fontFamily: 'inherit', outline: 'none', color: '#111', background: 'none' }} />
              <button onClick={fetchSalons} style={{ background: 'linear-gradient(45deg,#F77737,#E1306C,#833AB4)', color: 'white', border: 'none', padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                検索
              </button>
            </div>
          </div>

          {/* Area panel */}
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #DBDBDB', padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#737373', letterSpacing: '0.08em' }}>AREA</div>
              {selectedArea && (
                <button onClick={clearArea} style={{ fontSize: 11, color: '#737373', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>クリア ×</button>
              )}
            </div>

            {/* Region buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 14 }}>
              {Object.keys(REGIONS).map(region => (
                <button key={region} onClick={() => {
                  if (selectedRegion === region) { setSelectedRegion(''); setSelectedPref('') }
                  else { setSelectedRegion(region); setSelectedPref('') }
                }}
                  style={{ padding: '8px 4px', fontSize: 12, fontWeight: 500, border: selectedRegion === region ? 'none' : '1.5px solid #DBDBDB', borderRadius: 8, background: selectedRegion === region ? 'linear-gradient(45deg,#F77737,#E1306C,#833AB4,#5851DB)' : 'white', cursor: 'pointer', textAlign: 'center', color: selectedRegion === region ? 'white' : '#262626', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                  {region}
                </button>
              ))}
            </div>

            {/* Prefecture tabs */}
            {selectedRegion && (
              <div style={{ borderTop: '1px solid #DBDBDB', paddingTop: 14 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {Object.keys(REGIONS[selectedRegion]).map(pref => (
                    <button key={pref} onClick={() => setSelectedPref(pref)}
                      style={{ padding: '5px 14px', fontSize: 12, border: selectedPref === pref ? 'none' : '1.5px solid #DBDBDB', borderRadius: 100, background: selectedPref === pref ? 'linear-gradient(135deg,#FFF0F5,#F5F0FF)' : 'white', cursor: 'pointer', fontFamily: 'inherit', fontWeight: selectedPref === pref ? 700 : 400, color: selectedPref === pref ? '#E1306C' : '#737373', boxShadow: selectedPref === pref ? '0 0 0 1.5px #E1306C' : 'none' }}>
                      {pref}
                    </button>
                  ))}
                </div>

                {/* Area chips */}
                {selectedPref && REGIONS[selectedRegion][selectedPref] && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {REGIONS[selectedRegion][selectedPref].map(area => (
                      <button key={area} onClick={() => selectArea(area)}
                        style={{ padding: '5px 14px', fontSize: 12, border: selectedArea === area ? 'none' : '1.5px solid #DBDBDB', borderRadius: 100, background: selectedArea === area ? 'linear-gradient(45deg,#F77737,#E1306C,#833AB4,#5851DB)' : 'white', cursor: 'pointer', color: selectedArea === area ? 'white' : '#737373', fontFamily: 'inherit', fontWeight: selectedArea === area ? 700 : 400, transition: 'all 0.15s' }}>
                        {area}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedArea && (
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: '#737373' }}>選択中：</span>
                <span style={{ background: 'linear-gradient(45deg,#F77737,#E1306C,#833AB4)', color: 'white', fontSize: 12, fontWeight: 700, padding: '3px 14px', borderRadius: 100 }}>{selectedArea}</span>
              </div>
            )}
          </div>

          {/* Results */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: '#737373' }}>
              <strong style={{ color: '#111', fontWeight: 700 }}>{salons.length}件</strong>のサロン
              {selectedArea && <span style={{ color: '#E1306C', marginLeft: 4 }}>/ {selectedArea}</span>}
            </div>
            <select style={{ border: '1.5px solid #DBDBDB', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontFamily: 'inherit', color: '#262626', background: 'white', cursor: 'pointer' }}>
              <option>おすすめ順</option>
              <option>新着順</option>
            </select>
          </div>

          {/* Salon cards */}
          {salons.length === 0 ? (
            <div style={{ background: 'white', borderRadius: 16, border: '1px solid #DBDBDB', padding: 48, textAlign: 'center', color: '#737373' }}>
              サロンが見つかりません。条件を変えて検索してみてください。
            </div>
          ) : salons.map(salon => (
            <Link key={salon.id} href={`/salons/${salon.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: 'white', borderRadius: 16, border: '1px solid #DBDBDB', display: 'flex', overflow: 'hidden', marginBottom: 12, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 2px #E1306C, 0 8px 24px rgba(225,48,108,0.12)'; (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.borderColor = '#DBDBDB'; (e.currentTarget as HTMLElement).style.transform = 'none' }}>
                <div style={{ width: 140, flexShrink: 0, background: 'linear-gradient(135deg,#FBE0EC,#EED9F7)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 120, overflow: 'hidden' }}>
                  {salon.top_image
                    ? <img src={salon.top_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 36, fontWeight: 700, background: 'linear-gradient(45deg,#F77737,#E1306C,#833AB4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{salon.name?.[0] || 'S'}</span>}
                </div>
                <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', background: 'linear-gradient(135deg,#FFF0F5,#F5F0FF)', padding: '2px 10px', borderRadius: 100, marginBottom: 6, width: 'fit-content' }}>
                    <span style={{ background: 'linear-gradient(45deg,#F77737,#E1306C,#833AB4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{salon.genre}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 4 }}>{salon.name}</div>
                  <div style={{ fontSize: 11, color: '#737373', marginBottom: 6, lineHeight: 1.5 }}>
                    {salon.area}&nbsp;&nbsp;{salon.address}
                    {salon.nearest_station && <>&nbsp;&nbsp;/&nbsp;&nbsp;{salon.nearest_station}駅近</>}
                  </div>
                  {salon.description && (
                    <div style={{ fontSize: 12, color: '#888', lineHeight: 1.6, flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>{salon.description}</div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid #DBDBDB' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', background: '#E8F5E9', color: '#388E3C', borderRadius: 100 }}>ネット予約可</span>
                    <span style={{ fontSize: 12, fontWeight: 700, background: 'linear-gradient(45deg,#F77737,#E1306C,#833AB4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>予約する →</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Login / User widget */}
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #DBDBDB', padding: 20 }}>
            {user ? (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#737373', marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid #DBDBDB' }}>ログイン中</div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>こんにちは</div>
                <div style={{ fontSize: 11, color: '#737373', marginBottom: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {[{ label: '予約履歴', href: '/mypage' }, { label: 'お気に入りサロン', href: '#' }, { label: 'プロフィール編集', href: '#' }].map(item => (
                    <a key={item.label} href={item.href} style={{ fontSize: 12, color: '#111', display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #DBDBDB', textDecoration: 'none' }}>
                      {item.label}<span style={{ color: '#737373' }}>›</span>
                    </a>
                  ))}
                </div>
                <button onClick={handleLogout} style={{ width: '100%', marginTop: 14, padding: 9, fontSize: 12, border: '1.5px solid #DBDBDB', background: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', color: '#737373' }}>
                  ログアウト
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#737373', marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid #DBDBDB' }}>ログイン</div>
                <input type="email" placeholder="メールアドレス" value={email} onChange={e => setEmail(e.target.value)}
                  style={{ width: '100%', border: '1.5px solid #DBDBDB', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontFamily: 'inherit', outline: 'none', color: '#111', marginBottom: 8, background: '#FAFAFA' }} />
                <input type="password" placeholder="パスワード" value={password} onChange={e => setPassword(e.target.value)}
                  style={{ width: '100%', border: '1.5px solid #DBDBDB', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontFamily: 'inherit', outline: 'none', color: '#111', marginBottom: 8, background: '#FAFAFA' }} />
                <button onClick={handleLogin} disabled={loginLoading}
                  style={{ width: '100%', background: 'linear-gradient(45deg,#F77737,#E1306C,#833AB4,#5851DB)', color: 'white', border: 'none', padding: 11, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: loginLoading ? 0.6 : 1 }}>
                  {loginLoading ? '...' : 'ログイン'}
                </button>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                  <Link href="/auth" style={{ fontSize: 11, color: '#833AB4', fontWeight: 500, textDecoration: 'none' }}>新規会員登録</Link>
                  <Link href="/auth" style={{ fontSize: 11, color: '#737373', textDecoration: 'none' }}>サロン登録</Link>
                </div>
              </div>
            )}
          </div>

          {/* Campaign */}
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #DBDBDB', padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid #DBDBDB' }}>特集・キャンペーン</div>
            {['初回限定プラン特集', '週末の空き枠あり', '新規オープンサロン'].map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #DBDBDB', fontSize: 12, cursor: 'pointer', color: '#262626' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'linear-gradient(45deg,#F77737,#E1306C)', flexShrink: 0, display: 'block' }}></span>
                {t}
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{ background: 'linear-gradient(45deg,#F77737,#E1306C,#833AB4,#5851DB)', borderRadius: 16, padding: '24px 20px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.1em', marginBottom: 6 }}>FOR SALON OWNERS</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'white', lineHeight: 1.4, marginBottom: 6 }}>サロン掲載を<br />はじめませんか</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, marginBottom: 16 }}>大手より低コストで質の高い顧客と繋がれます。</div>
            <Link href="/auth" style={{ display: 'block', background: 'white', color: '#E1306C', padding: 10, borderRadius: 10, fontSize: 12, fontWeight: 700, textAlign: 'center', textDecoration: 'none' }}>
              無料で掲載を始める
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}