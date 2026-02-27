'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import BlockButton from '@/components/BlockButton'

export default function SalonDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const [salon, setSalon] = useState<any>(null)
  const [menus, setMenus] = useState<any[]>([])
  const [selectedMenu, setSelectedMenu] = useState<any>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    fetchSalonData()
  }, [])

  const fetchSalonData = async () => {
    const { data: salonData } = await supabase
      .from('salons').select('*').eq('id', id).single()
    setSalon(salonData)
    const { data: menuData } = await supabase
      .from('menus').select('*').eq('salon_id', id)
    setMenus(menuData || [])
  }

  const makeReservation = async () => {
    if (!user) { router.push('/auth'); return }
    if (!selectedMenu || !selectedDate || !selectedTime) {
      alert('メニュー・日付・時間を選んでください')
      return
    }
    setLoading(true)
    const reservedAt = `${selectedDate}T${selectedTime}:00+09:00`
    const { error } = await supabase.from('reservations').insert({
      user_id: user.id,
      salon_id: id,
      menu_id: selectedMenu.id,
      reserved_at: reservedAt
    })
    setLoading(false)
    if (error) alert('予約失敗: ' + error.message)
    else alert('✅ 予約完了！')
  }

  if (!salon) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">読み込み中...</p>
    </div>
  )

  const times = ['10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00']
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-pink-500 text-white p-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white text-xl">←</button>
        <h1 className="text-lg font-bold flex-1">{salon.name}</h1>
        <BlockButton salonId={id} />
      </header>

      <div className="max-w-2xl mx-auto p-4">
        {/* サロン情報 */}
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <div className="bg-pink-100 rounded-lg h-40 flex items-center justify-center text-5xl mb-3">
            💅
          </div>
          <h2 className="text-xl font-bold mb-1">{salon.name}</h2>
          <p className="text-sm text-gray-500">📍 {salon.area}　{salon.address}</p>
          {salon.nearest_station && (
            <p className="text-sm text-gray-500">🚃 {salon.nearest_station}駅近</p>
          )}
          {salon.description && (
            <p className="text-sm text-gray-600 mt-2">{salon.description}</p>
          )}
        </div>

        {/* メニュー選択 */}
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <h3 className="font-bold text-lg mb-3">📋 メニューを選ぶ</h3>
          {menus.length === 0 ? (
            <p className="text-gray-400 text-sm">メニューがまだありません</p>
          ) : (
            menus.map(menu => (
              <div
                key={menu.id}
                onClick={() => setSelectedMenu(menu)}
                className={`p-3 border rounded-lg cursor-pointer mb-2 transition ${
                  selectedMenu?.id === menu.id
                    ? 'border-pink-500 bg-pink-50'
                    : 'border-gray-200 hover:border-pink-300'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm">{menu.name}</span>
                  <span className="text-pink-600 font-bold">¥{menu.price.toLocaleString()}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">⏱ {menu.duration}分</p>
              </div>
            ))
          )}
        </div>

        {/* 日付・時間選択 */}
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <h3 className="font-bold text-lg mb-3">📅 日付を選ぶ</h3>
          <input
            type="date"
            value={selectedDate}
            min={today}
            onChange={e => setSelectedDate(e.target.value)}
            className="border rounded-lg p-3 w-full mb-4"
          />
          <h3 className="font-bold text-lg mb-3">🕐 時間を選ぶ</h3>
          <div className="grid grid-cols-3 gap-2">
            {times.map(t => (
              <button
                key={t}
                onClick={() => setSelectedTime(t)}
                className={`p-2 border rounded-lg text-sm transition ${
                  selectedTime === t
                    ? 'bg-pink-500 text-white border-pink-500'
                    : 'border-gray-200 hover:border-pink-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* 予約確認 */}
        {selectedMenu && selectedDate && selectedTime && (
          <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 mb-4">
            <h3 className="font-bold mb-2">📝 予約内容</h3>
            <p className="text-sm">メニュー：{selectedMenu.name}</p>
            <p className="text-sm">日時：{selectedDate} {selectedTime}</p>
            <p className="text-sm">料金：¥{selectedMenu.price.toLocaleString()}</p>
          </div>
        )}

        {/* 予約ボタン */}
        <button
          onClick={makeReservation}
          disabled={loading}
          className="w-full bg-pink-500 text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50"
        >
          {loading ? '処理中...' : user ? '予約を確定する' : 'ログインして予約する'}
        </button>
      </div>
    </div>
  )
}