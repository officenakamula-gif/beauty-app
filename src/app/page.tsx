'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { REGIONS } from '@/lib/areas'
import { GENRE_GROUPS } from '@/lib/genres'

const GENRES = [
  { key: 'ヘアサロン', label: 'ヘアサロン' },
  { key: 'ネイル・まつげ', label: 'ネイル・まつげ' },
  { key: 'リラク・エステ・脱毛', label: 'リラク・エステ・脱毛' },
]

export default function HomePage() {
  const [profile, setProfile] = useState<any>(null)
  const [salons, setSalons] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [selectedRegion, setSelectedRegion] = useState('')
  const [selectedPref, setSelectedPref] = useState('')
  const [selectedArea, setSelectedArea] = useState('')
  const [genre, setGenre] = useState('ヘアサロン')
  const [selectedSubGenre, setSelectedSubGenre] = useState('')
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

  useEffect(() => { fetchSalons() }, [search, selectedArea, genre, selectedSubGenre])

  const fetchSalons = async () => {
    let query = supabase.from('salons').select('*').eq('is_active', true)
    if (search) query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%,nearest_station.ilike.%${search}%`)
    if (selectedArea) query = query.eq('area', selectedArea)
    if (genre) query = query.eq('genre', genre)
    if (selectedSubGenre) query = query.eq('sub_genre', selectedSubGenre)
    const { data } = await query.order('created_at', { ascending: false })
    setSalons(data || [])
  }

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'https://beauty-app-mhst.vercel.app/auth/callback' }
    })
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

  const selectArea = (area: string) => { setSelectedArea(area) }

  const clearArea = () => {
    setSelectedRegion('')
    setSelectedPref('')
    setSelectedArea('')
  }

  // ジャンルをクリックで大カテゴリ切替＋小ジャンル絞り込み
  const handleSubGenreClick = (cat: string, sub: string) => {
    setGenre(cat)
    setSelectedSubGenre(prev => prev === sub ? '' : sub)
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

      {/* Genre tabs（大カテゴリ） */}
      <div style={{ background: 'white', borderBottom: '1px solid #DBDBDB', padding: '0 32px', display: 'flex' }}>
        {GENRES.map(g => (
          <button key={g.key} onClick={() => { setGenre(g.key); setSelectedSubGenre('') }}
            style={{ padding: '12px 20px', fontSize: 13, fontWeight: 500, border: 'none', borderBottom: genre === g.key ? '2px solid #E1306C' : '2px solid transparent', background: 'none', cursor: 'pointer', color: genre === g.key ? '#111' : '#737373', fontFamily: 'inherit', transition: 'all 0.2s' }}>
            {g.label}
          </button>
        ))}
      </div>

      {/* ━━ ジャンルで検索セクション ━━ */}
      <div style={{ background: 'white', borderBottom: '1px solid #DBDBDB', padding: '20px 32px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#737373', letterSpacing: '0.08em', marginBottom: 14 }}>
            {genre}をジャンルから探す
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(GENRE_GROUPS.find(g => g.category === genre)?.genres || []).map(sub => (
              <button
                key={sub}
                onClick={() => handleSubGenreClick(genre, sub)}
                style={{
                  padding: '6px 14px',
                  fontSize: 12,
                  fontWeight: selectedSubGenre === sub ? 700 : 400,
                  border: selectedSubGenre === sub ? 'none' : '1.5px solid #DBDBDB',
                  borderRadius: 100,
                  background: selectedSubGenre === sub
                    ? 'linear-gradient(45deg,#F77737,#E1306C,#833AB4,#5851DB)'
                    : 'white',
                  color: selectedSubGenre === sub ? 'white' : '#262626',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap' as const,
                }}>
                {sub}
              </button>
            ))}
          </div>
          {selectedSubGenre && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#737373' }}>絞り込み中：</span>
              <span style={{ background: 'linear-gradient(45deg,#F77737,#E1306C,#833AB4)', color: 'white', fontSize: 12, fontWeight: 700, padding: '3px 14px', borderRadius: 100 }}>{selectedSubGenre}</span>
              <button
                onClick={() => setSelectedSubGenre('')}
                style={{ fontSize: 11, color: '#737373', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                クリア ×
              </button>
            </div>
          )}
        </div>
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
              {selectedSubGenre && <span style={{ color: '#E1306C', marginLeft: 4 }}>/ {selectedSubGenre}</span>}
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
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' as const }}>
                    <div style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', background: 'linear-gradient(135deg,#FFF0F5,#F5F0FF)', padding: '2px 10px', borderRadius: 100, width: 'fit-content' }}>
                      <span style={{ background: 'linear-gradient(45deg,#F77737,#E1306C,#833AB4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{salon.genre}</span>
                    </div>
                    {salon.sub_genre && (
                      <div style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, background: '#F5F0FF', padding: '2px 10px', borderRadius: 100, color: '#833AB4', width: 'fit-content' }}>
                        {salon.sub_genre}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 4 }}>{salon.name}</div>
                  <div style={{ fontSize: 11, color: '#737373', marginBottom: 6, lineHeight: 1.7 }}>
                    <span>{salon.area}　{salon.address}</span>
                    {salon.nearest_station && <span style={{ color: '#BDBDBD', margin: '0 4px' }}>|</span>}
                    {salon.nearest_station && <span>{salon.nearest_station}駅近く</span>}
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

                {/* メール・パスワードログイン */}
                <input type="email" placeholder="メールアドレス" value={email} onChange={e => setEmail(e.target.value)}
                  style={{ width: '100%', border: '1.5px solid #DBDBDB', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontFamily: 'inherit', outline: 'none', color: '#111', marginBottom: 8, background: '#FAFAFA' }} />
                <input type="password" placeholder="パスワード" value={password} onChange={e => setPassword(e.target.value)}
                  style={{ width: '100%', border: '1.5px solid #DBDBDB', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontFamily: 'inherit', outline: 'none', color: '#111', marginBottom: 8, background: '#FAFAFA' }} />
                <button onClick={handleLogin} disabled={loginLoading}
                  style={{ width: '100%', background: 'linear-gradient(45deg,#F77737,#E1306C,#833AB4,#5851DB)', color: 'white', border: 'none', padding: 11, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: loginLoading ? 0.6 : 1 }}>
                  {loginLoading ? '...' : 'ログイン'}
                </button>

                {/* 区切り線 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0' }}>
                  <div style={{ flex: 1, height: 1, background: '#DBDBDB' }} />
                  <span style={{ fontSize: 11, color: '#737373' }}>または</span>
                  <div style={{ flex: 1, height: 1, background: '#DBDBDB' }} />
                </div>

                {/* Googleログイン */}
                <button onClick={handleGoogleLogin}
                  style={{ width: '100%', background: 'white', color: '#262626', border: '1.5px solid #DBDBDB', padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14 }}>
                  <svg width="16" height="16" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                  Googleでログイン
                </button>

                {/* 新規登録・サロン登録 */}
                <div style={{ borderTop: '1px solid #DBDBDB', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Link href="/auth" style={{ display: 'block', textAlign: 'center', background: 'linear-gradient(135deg,#FFF0F5,#F5F0FF)', color: '#E1306C', fontSize: 12, fontWeight: 700, padding: '9px 0', borderRadius: 10, textDecoration: 'none', border: '1px solid #F0C0D8' }}>
                    新規会員登録（無料）
                  </Link>
                  <Link href="/auth" style={{ display: 'block', textAlign: 'center', background: '#FAFAFA', color: '#737373', fontSize: 12, fontWeight: 700, padding: '9px 0', borderRadius: 10, textDecoration: 'none', border: '1px solid #DBDBDB' }}>
                    サロン掲載を始める
                  </Link>
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

      {/* ── サロンオーナー向けセクション ── */}
      <div style={{ background: '#FAFAFA', borderTop: '1px solid #DBDBDB', padding: '60px 32px 80px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>

          {/* ヒーロー */}
          <div style={{ background: 'linear-gradient(45deg,#F77737,#E1306C,#833AB4,#5851DB)', borderRadius: 20, padding: '48px 40px', textAlign: 'center', marginBottom: 32 }}>
            <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.18)', color: 'white', fontSize: 11, fontWeight: 700, padding: '4px 14px', borderRadius: 100, marginBottom: 16, letterSpacing: '0.08em' }}>
              ベータ期間中・完全無料
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'white', lineHeight: 1.5, marginBottom: 12 }}>
              あなたのサロンを<br />Salon de Beautyに掲載しませんか
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.9, marginBottom: 28 }}>
              月額数万円の予約サービスと同じ機能を、今なら無料で。<br />
              ネット予約・写真掲載・スタッフ管理まですべて揃っています。
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' as const }}>
              <Link href="/auth" style={{ background: 'white', color: '#E1306C', fontSize: 14, fontWeight: 700, padding: '12px 28px', borderRadius: 10, textDecoration: 'none', display: 'inline-block' }}>
                無料で掲載を始める
              </Link>
            </div>
          </div>

          {/* 数字 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { num: '¥0', label: 'ベータ期間中の月額' },
              { num: '24h', label: 'ネット予約受付' },
              { num: '5分', label: '登録所要時間' },
            ].map(s => (
              <div key={s.num} style={{ background: 'white', borderRadius: 12, border: '1px solid #DBDBDB', padding: '18px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 700, background: 'linear-gradient(45deg,#F77737,#E1306C,#833AB4,#5851DB)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{s.num}</div>
                <div style={{ fontSize: 11, color: '#737373', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* 比較訴求 */}
          <div style={{ background: 'white', borderLeft: '3px solid #E1306C', borderRadius: '0 12px 12px 0', padding: '18px 22px', marginBottom: 32 }}>
            <div style={{ fontSize: 13, color: '#555', lineHeight: 2.2 }}>
              大手予約サービスの月額は<span style={{ fontWeight: 700, color: '#111' }}>数万円〜10万円以上</span>が一般的です。<br />
              Salon de Beautyなら同等の機能を<span style={{ fontWeight: 700, color: '#E1306C' }}>ベータ期間中は完全無料</span>で利用できます。<br />
              ベータ期間終了後も<span style={{ fontWeight: 700, color: '#111' }}>無料プランは継続</span>、有料プランも相場より大幅に安く提供予定です。<br />
              <span style={{ fontSize: 11, color: '#BDBDBD' }}>※ベータ期間の終了時期は未定です。終了の際は事前にメールでお知らせします。</span>
            </div>
          </div>

          {/* 機能一覧 */}
          <div style={{ fontSize: 16, fontWeight: 700, color: '#111', textAlign: 'center', marginBottom: 20 }}>無料でできること</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 32 }}>
            {[
              { title: 'サロン情報・写真掲載', desc: 'メニュー・スタイリスト・施術写真を自由に登録' },
              { title: '24時間ネット予約', desc: '電話対応なしで予約受付。承認・キャンセルも管理画面から' },
              { title: 'スタイリスト管理', desc: 'スタッフ別の稼働スケジュールと指名予約に対応' },
              { title: '予約・来店管理', desc: '予約一覧・承認・キャンセル・来店完了を一画面で管理' },
              { title: 'メール自動通知', desc: '予約申請・確定・キャンセル時にお客様・サロン双方へ自動送信' },
              { title: '検索・ジャンル掲載', desc: 'エリア・ジャンル・キーワード検索でユーザーに見つけてもらえます' },
            ].map(f => (
              <div key={f.title} style={{ background: 'white', borderRadius: 12, border: '1px solid #DBDBDB', padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(45deg,#F77737,#E1306C,#833AB4,#5851DB)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'white', flexShrink: 0 }}>+</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 4 }}>{f.title}</div>
                  <div style={{ fontSize: 11, color: '#737373', lineHeight: 1.7 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* 掲載の流れ */}
          <div style={{ fontSize: 16, fontWeight: 700, color: '#111', textAlign: 'center', marginBottom: 20 }}>掲載までの流れ</div>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10, marginBottom: 32 }}>
            {[
              { n: 1, title: '申請フォームに入力（約5分）', desc: 'サロン名・電話番号・担当者名を入力するだけ' },
              { n: 2, title: '確認後、掲載開始のご連絡', desc: '掲載開始までの間にダッシュボードからサロン情報・写真を入力できます' },
              { n: 3, title: '掲載開始・予約受付スタート', desc: 'ユーザーからの予約が届き始めます' },
            ].map(s => (
              <div key={s.n} style={{ background: 'white', borderRadius: 12, border: '1px solid #DBDBDB', padding: '16px 18px', display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(45deg,#F77737,#E1306C,#833AB4,#5851DB)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'white', flexShrink: 0 }}>{s.n}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{s.title}</div>
                  <div style={{ fontSize: 11, color: '#737373', marginTop: 2 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* 安心訴求 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 32 }}>
            {[
              { title: 'いつでも退会', desc: '契約期間の縛りなし。気軽に始められます' },
              { title: '個人も歓迎', desc: '個人サロン・自宅サロン・開業したてのサロンも大歓迎' },
              { title: '小規模でもOK', desc: 'スタッフ1名のサロンでもすべての機能が使えます' },
            ].map(s => (
              <div key={s.title} style={{ background: 'white', borderRadius: 12, border: '1px solid #DBDBDB', padding: '18px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, background: 'linear-gradient(45deg,#F77737,#E1306C,#833AB4,#5851DB)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{s.title}</div>
                <div style={{ fontSize: 11, color: '#737373', lineHeight: 1.7 }}>{s.desc}</div>
              </div>
            ))}
          </div>

          {/* 最終CTA */}
          <div style={{ background: 'linear-gradient(45deg,#F77737,#E1306C,#833AB4,#5851DB)', borderRadius: 16, padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em', marginBottom: 8 }}>ベータ期間中・完全無料</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'white', marginBottom: 8 }}>今すぐ無料で掲載を始める</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 24 }}>クレジットカード不要・いつでも退会可能</div>
            <Link href="/auth" style={{ background: 'white', color: '#E1306C', fontSize: 14, fontWeight: 700, padding: '12px 40px', borderRadius: 10, textDecoration: 'none', display: 'inline-block' }}>
              無料で申請する
            </Link>
          </div>

        </div>
      </div>

    </div>
  )
}