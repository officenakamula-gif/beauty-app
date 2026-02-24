// D:\dev\beauty-app\src\app\salons\[id]\page.tsx
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'
 
export default function SalonDetailPage() {
  const { id } = useParams()
  const [salon, setSalon] = useState<any>(null)
  const [menus, setMenus] = useState<any[]>([])
  const [selectedMenu, setSelectedMenu] = useState<any>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
 
  useEffect(() => { fetchSalonData() }, [])
 
  const fetchSalonData = async () => {
    const { data: salonData } = await supabase
      .from('salons').select('*').eq('id', id).single()
    setSalon(salonData)
    const { data: menuData } = await supabase
      .from('menus').select('*').eq('salon_id', id)
    setMenus(menuData || [])
  }
 
  const makeReservation = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { alert('ログインしてください'); return }
    const reservedAt = `${selectedDate}T${selectedTime}:00+09:00`
    const { error } = await supabase.from('reservations').insert({
      user_id: user.id, salon_id: id,
      menu_id: selectedMenu.id, reserved_at: reservedAt
    })
    if (error) alert('予約失敗: ' + error.message)
    else alert('予約完了！')
  }
 
  if (!salon) return <div>読み込み中...</div>
  const times = ['10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00']
 
  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{salon.name}</h1>
      <h2 className="font-bold text-lg mb-2">メニューを選ぶ</h2>
      {menus.map(menu => (
        <div key={menu.id} onClick={() => setSelectedMenu(menu)}
          className={`p-4 border rounded-lg cursor-pointer mb-2 ${selectedMenu?.id === menu.id ? 'border-pink-500 bg-pink-50' : ''}`}>
          <div className="flex justify-between">
            <span className="font-bold">{menu.name}</span>
            <span className="text-pink-600">¥{menu.price.toLocaleString()}</span>
          </div>
        </div>
      ))}
      <input type="date" value={selectedDate}
        onChange={e => setSelectedDate(e.target.value)}
        className="border rounded-lg p-3 w-full my-4" />
      <div className="grid grid-cols-3 gap-2 mb-4">
        {times.map(t => (
          <button key={t} onClick={() => setSelectedTime(t)}
            className={`p-2 border rounded-lg ${selectedTime === t ? 'bg-pink-500 text-white' : ''}`}>
            {t}
          </button>
        ))}
      </div>
      <button onClick={makeReservation}
        className="w-full bg-pink-500 text-white py-4 rounded-xl font-bold">
        予約を確定する
      </button>
    </div>
  )
}
