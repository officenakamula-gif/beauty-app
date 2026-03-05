'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const GENRES = [
  { key: 'ヘアサロン', label: 'ヘアサロン', icon: '✂️' },
  { key: 'ネイル・まつげ', label: 'ネイル・まつげ', icon: '💅' },
  { key: 'リラク・エステ', label: 'リラク・エステ', icon: '💆' },
]

const AREAS = ['渋谷', '新宿', '銀座', '恵比寿', '表参道', '原宿', '六本木', '池袋', '品川', '横浜', '梅田', '難波', '名古屋', '博多', '札幌']

export default function HomePage() {
  const [profile, setProfile] = useState<any>(null)
  const [salons, setSalons] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [area, setArea] = useState('')
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
    fetchSalons()
  }, [])

  useEffect(() => { fetchSalons() }, [search, area, genre])

  const fetchSalons = async () => {
    let query = supabase.from('salons').select('*').eq('is_active', true)
    if (search) query = query.ilike('name', `%${search}%`)
    if (area) query = query.eq('area', area)
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

  return (
    <div className="min-h-screen bg-gray-100">

      {/* ヘッダー */}
      <header className="bg-pink-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight">💄 BeautyBook</h1>
            <span className="text-xs bg-pink-400 px-2 py-1 rounded-full">美容サロン予約サイト</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a href="#" className="opacity-75 hover:opacity-100">マイページ</a>
            <a href="#" className="opacity-75 hover:opacity-100">ヘルプ</a>
          </div>
        </div>

        {/* ジャンルナビ */}
        <div className="border-t border-pink-500">
          <div className="max-w-6xl mx-auto px-4 flex">
            {GENRES.map(g => (
              <button key={g.key} onClick={() => setGenre(g.key)}
                className={`px-6 py-3 text-sm font-bold transition border-b-2 ${
                  genre === g.key
                    ? 'border-white text-white'
                    : 'border-transparent text-pink-200 hover:text-white'
                }`}>
                {g.icon} {g.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6">

        {/* メインコンテンツ */}
        <div className="flex-1">

          {/* 検索バー */}
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <h2 className="font-bold text-lg mb-3">
              {GENRES.find(g => g.key === genre)?.icon} {genre}を探す
            </h2>
            <div className="flex gap-2 mb-3">
              <input
                placeholder="サロン名・キーワードで検索"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 border rounded p-2 text-sm"
              />
              <button onClick={fetchSalons}
                className="bg-pink-600 text-white px-6 py-2 rounded text-sm font-bold">
                検索
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setArea('')}
                className={`text-xs px-3 py-1 rounded-full border transition ${!area ? 'bg-pink-600 text-white border-pink-600' : 'border-gray-300 text-gray-600'}`}>
                すべて
              </button>
              {AREAS.map(a => (
                <button key={a} onClick={() => setArea(a)}
                  className={`text-xs px-3 py-1 rounded-full border transition ${area === a ? 'bg-pink-600 text-white border-pink-600' : 'border-gray-300 text-gray-600 hover:border-pink-400'}`}>
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* サロン一覧 */}
          <div className="mb-2 flex justify-between items-center">
            <p className="text-sm text-gray-600"><span className="font-bold text-gray-900">{salons.length}件</span>のサロンが見つかりました</p>
            <select className="text-xs border rounded p-1 text-gray-600">
              <option>おすすめ順</option>
              <option>新着順</option>
            </select>
          </div>

          {salons.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-400 text-lg">サロンが見つかりません</p>
              <p className="text-gray-300 text-sm mt-1">条件を変えて検索してみてください</p>
            </div>
          ) : (
            <div className="space-y-3">
              {salons.map(salon => (
                <Link key={salon.id} href={`/salons/${salon.id}`}>
                  <div className="bg-white rounded-lg shadow hover:shadow-md transition flex overflow-hidden mb-3">
                    {/* サムネイル */}
                    <div className="w-40 h-32 flex-shrink-0 bg-pink-100 flex items-center justify-center overflow-hidden">
                      {salon.top_image
                        ? <img src={salon.top_image} alt="" className="w-full h-full object-cover" />
                        : <span className="text-4xl">
                            {salon.genre === 'ヘアサロン' ? '✂️' : salon.genre === 'ネイル・まつげ' ? '💅' : '💆'}
                          </span>}
                    </div>
                    {/* 情報 */}
                    <div className="p-4 flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded font-bold">{salon.genre}</span>
                          <h3 className="font-bold text-base mt-1">{salon.name}</h3>
                          <p className="text-xs text-gray-500 mt-1">📍 {salon.area}　{salon.address}</p>
                          {salon.nearest_station && <p className="text-xs text-gray-400">🚃 {salon.nearest_station}駅近</p>}
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400">⭐ 新着</div>
                        </div>
                      </div>
                      {salon.description && (
                        <p className="text-xs text-gray-500 mt-2 line-clamp-2">{salon.description}</p>
                      )}
                      <div className="mt-2">
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold">ネット予約OK</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* 右カラム */}
        <div className="w-64 flex-shrink-0 space-y-4">

          {/* ログインエリア */}
          <div className="bg-white rounded-lg shadow p-4">
            {user ? (
              <div>
                <p className="text-sm font-bold text-gray-800 mb-1">こんにちは！</p>
                <p className="text-xs text-gray-500 mb-3 truncate">{user.email}</p>
                {profile?.full_name && (
                  <p className="text-sm font-bold mb-2">{profile.full_name} さん</p>
                )}
                <div className="space-y-2">
                  <a href="#" className="block text-xs text-pink-600 hover:underline">▶ 予約履歴</a>
                  <a href="#" className="block text-xs text-pink-600 hover:underline">▶ お気に入りサロン</a>
                  <a href="#" className="block text-xs text-pink-600 hover:underline">▶ プロフィール編集</a>
                </div>
                <button onClick={handleLogout}
                  className="w-full mt-3 border border-gray-300 text-gray-500 text-xs py-2 rounded">
                  ログアウト
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm font-bold text-center mb-3">ログイン</p>
                <input type="email" placeholder="メールアドレス"
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full border rounded p-2 text-xs mb-2" />
                <input type="password" placeholder="パスワード"
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full border rounded p-2 text-xs mb-2" />
                <button onClick={handleLogin} disabled={loginLoading}
                  className="w-full bg-pink-600 text-white py-2 rounded text-sm font-bold disabled:opacity-50">
                  {loginLoading ? '...' : 'ログイン'}
                </button>
                <div className="mt-2 text-center">
                  <Link href="/auth" className="text-xs text-pink-600 hover:underline">新規会員登録はこちら</Link>
                </div>
                <div className="mt-2 text-center">
                  <Link href="/auth" className="text-xs text-gray-400 hover:underline">サロン登録はこちら</Link>
                </div>
              </div>
            )}
          </div>

          {/* エリアから探す（イメージ） */}
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm font-bold mb-3">エリアから探す</p>
            <div className="grid grid-cols-2 gap-1">
              {['関東', '関西', '東海', '北海道', '東北', '九州'].map(r => (
                <button key={r} className="text-xs border border-gray-200 rounded p-2 text-gray-600 hover:border-pink-400 hover:text-pink-600 transition">
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* おすすめ特集（イメージ） */}
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm font-bold mb-3">✨ 特集・キャンペーン</p>
            <div className="space-y-2">
              {['初回限定クーポン', '週末空き枠あり', '新規オープン'].map(t => (
                <div key={t} className="bg-pink-50 rounded p-2 text-xs text-pink-700 font-bold cursor-pointer hover:bg-pink-100 transition">
                  ▶ {t}
                </div>
              ))}
            </div>
          </div>

          {/* サロン掲載案内 */}
          <div className="bg-gradient-to-br from-pink-500 to-pink-700 rounded-lg shadow p-4 text-white">
            <p className="text-sm font-bold mb-1">💅 サロン掲載をお考えの方</p>
            <p className="text-xs opacity-80 mb-3">HPBより低コストで掲載できます</p>
            <Link href="/auth"
              className="block text-center bg-white text-pink-600 text-xs font-bold py-2 rounded hover:bg-pink-50 transition">
              無料で掲載を始める
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}