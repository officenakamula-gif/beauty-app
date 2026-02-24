// D:\dev\beauty-app\src\app\page.tsx
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
 
export default function HomePage() {
  const [salons, setSalons] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [area, setArea] = useState('')
 
  useEffect(() => { fetchSalons() }, [search, area])
 
  const fetchSalons = async () => {
    let query = supabase.from('salons')
      .select('id, name, area, nearest_station, images')
    if (search) query = query.or(`name.ilike.%${search}%`)
    if (area) query = query.eq('area', area)
    const { data } = await query.order('created_at', { ascending: false })
    setSalons(data || [])
    // ※ RLSによりブロック済みサロンは自動除外される！
  }
 
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-pink-500 text-white p-4">
        <h1 className="text-2xl font-bold">💄 BeautyBook</h1>
      </header>
      <div className="p-4 bg-white shadow">
        <input placeholder="サロン名で検索"
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full border rounded-lg p-3 mb-2" />
        <select value={area} onChange={e => setArea(e.target.value)}
          className="border rounded-lg p-3">
          <option value="">全エリア</option>
          <option value="渋谷">渋谷</option>
          <option value="新宿">新宿</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4 p-4">
        {salons.map(salon => (
          <Link key={salon.id} href={`/salons/${salon.id}`}>
            <div className="bg-white rounded-xl shadow p-3">
              <h2 className="font-bold">{salon.name}</h2>
              <p className="text-sm text-gray-500">{salon.area}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
