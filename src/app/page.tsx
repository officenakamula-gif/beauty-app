'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const [profile, setProfile] = useState<any>(null)
  const [salons, setSalons] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [area, setArea] = useState('')
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
  supabase.auth.getUser().then(async ({ data }) => {
    setUser(data.user)
    if (data.user) {
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
      setProfile(prof)
    }
  })
  fetchSalons()
}, [])

  useEffect(() => { fetchSalons() }, [search, area])

  const fetchSalons = async () => {
    let query = supabase.from('salons').select('*').eq('is_active', true)
    if (search) query = query.ilike('name', `%${search}%`)
    if (area) query = query.eq('area', area)
    const { data } = await query.order('created_at', { ascending: false })
    setSalons(data || [])
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  {user ? (
  <div className="flex gap-2">
    {profile?.role === 'salon' && (
      <button onClick={() => router.push('/dashboard')}
        className="text-xs bg-pink-100 text-pink-600 px-3 py-1 rounded-full font-bold">
        管理画面
      </button>
    )}
    <button onClick={handleLogout}
      className="text-xs bg-white text-pink-500 px-3 py-1 rounded-full font-bold">
      ログアウト
    </button>
  </div>
) : (
  <Link href="/auth" className="text-xs bg-white text-pink-500 px-3 py-1 rounded-full font-bold">
    ログイン
  </Link>
)}

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-pink-500 text-white p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">💄 BeautyBook</h1>
        <div>
          {user ? (
            <button onClick={handleLogout} className="text-sm bg-white text-pink-500 px-3 py-1 rounded-full font-bold">
              ログアウト
            </button>
          ) : (
            <Link href="/auth" className="text-sm bg-white text-pink-500 px-3 py-1 rounded-full font-bold">
              ログイン
            </Link>
          )}
        </div>
      </header>

      {/* 検索 */}
      <div className="p-4 bg-white shadow">
        <input
          placeholder="サロン名で検索"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border rounded-lg p-3 mb-2 text-sm"
        />
        <select
          value={area}
          onChange={e => setArea(e.target.value)}
          className="border rounded-lg p-2 text-sm w-full"
        >
          <option value="">全エリア</option>
          <option value="渋谷">渋谷</option>
          <option value="新宿">新宿</option>
          <option value="銀座">銀座</option>
          <option value="恵比寿">恵比寿</option>
          <option value="表参道">表参道</option>
        </select>
      </div>

      {/* サロン一覧 */}
      <div className="p-4">
        {salons.length === 0 ? (
          <p className="text-center text-gray-400 mt-8">サロンが見つかりません</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {salons.map(salon => (
              <Link key={salon.id} href={`/salons/${salon.id}`}>
                <div className="bg-white rounded-xl shadow p-3 hover:shadow-md transition">
                  <div className="bg-pink-100 rounded-lg h-24 mb-2 flex items-center justify-center text-3xl">
                    💅
                  </div>
                  <h2 className="font-bold text-sm">{salon.name}</h2>
                  <p className="text-xs text-gray-500 mt-1">📍 {salon.area}</p>
                  {salon.nearest_station && (
                    <p className="text-xs text-gray-400">🚃 {salon.nearest_station}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}