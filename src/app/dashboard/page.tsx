'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [salon, setSalon] = useState<any>(null)
  const [menus, setMenus] = useState<any[]>([])
  const [reservations, setReservations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'salon' | 'menus' | 'reservations'>('salon')

  // サロン編集用
  const [salonForm, setSalonForm] = useState({ name: '', area: '', address: '', nearest_station: '', description: '', phone: '' })

  // メニュー追加用
  const [menuForm, setMenuForm] = useState({ name: '', price: '', duration: '' })

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    setUser(user)

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof)

    if (prof?.role !== 'salon') { router.push('/'); return }

    const { data: salonData } = await supabase.from('salons').select('*').eq('owner_id', user.id).single()
    if (salonData) {
      setSalon(salonData)
      setSalonForm({
        name: salonData.name || '',
        area: salonData.area || '',
        address: salonData.address || '',
        nearest_station: salonData.nearest_station || '',
        description: salonData.description || '',
        phone: salonData.phone || ''
      })
      const { data: menuData } = await supabase.from('menus').select('*').eq('salon_id', salonData.id)
      setMenus(menuData || [])
      const { data: resData } = await supabase.from('reservations').select('*, menus(name, price)').eq('salon_id', salonData.id).order('reserved_at', { ascending: false })
      setReservations(resData || [])
    }
    setLoading(false)
  }

  const saveSalon = async () => {
    if (!salonForm.name || !salonForm.area || !salonForm.address) {
      alert('サロン名・エリア・住所は必須です')
      return
    }
    if (salon) {
      await supabase.from('salons').update(salonForm).eq('id', salon.id)
      alert('✅ サロン情報を更新しました')
    } else {
      const { data } = await supabase.from('salons').insert({ ...salonForm, owner_id: user.id, is_active: true }).select().single()
      setSalon(data)
      alert('✅ サロンを登録しました')
    }
    init()
  }

  const addMenu = async () => {
    if (!salon) { alert('先にサロン情報を保存してください'); return }
    if (!menuForm.name || !menuForm.price || !menuForm.duration) {
      alert('全項目を入力してください')
      return
    }
    await supabase.from('menus').insert({
      salon_id: salon.id,
      name: menuForm.name,
      price: parseInt(menuForm.price),
      duration: parseInt(menuForm.duration)
    })
    setMenuForm({ name: '', price: '', duration: '' })
    const { data } = await supabase.from('menus').select('*').eq('salon_id', salon.id)
    setMenus(data || [])
    alert('✅ メニューを追加しました')
  }

  const deleteMenu = async (menuId: string) => {
    if (!confirm('このメニューを削除しますか？')) return
    await supabase.from('menus').delete().eq('id', menuId)
    setMenus(menus.filter(m => m.id !== menuId))
  }

  const updateReservationStatus = async (id: string, status: string) => {
    await supabase.from('reservations').update({ status }).eq('id', id)
    setReservations(reservations.map(r => r.id === id ? { ...r, status } : r))
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">読み込み中...</p></div>

  const statusColor: any = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    completed: 'bg-gray-100 text-gray-600'
  }
  const statusLabel: any = { pending: '未確認', confirmed: '確認済', cancelled: 'キャンセル', completed: '完了' }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-pink-500 text-white p-4 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold">💅 サロン管理画面</h1>
          <p className="text-xs opacity-75">{user?.email}</p>
        </div>
        <button onClick={() => router.push('/')} className="text-xs bg-white text-pink-500 px-3 py-1 rounded-full font-bold">
          サイトへ戻る
        </button>
      </header>

      {/* タブ */}
      <div className="flex border-b bg-white">
        {(['salon', 'menus', 'reservations'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-bold transition ${tab === t ? 'border-b-2 border-pink-500 text-pink-500' : 'text-gray-400'}`}>
            {t === 'salon' ? '🏪 サロン情報' : t === 'menus' ? '📋 メニュー' : '📅 予約一覧'}
          </button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto p-4">

        {/* サロン情報タブ */}
        {tab === 'salon' && (
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-bold text-lg mb-4">サロン情報の{salon ? '編集' : '登録'}</h2>
            {[
              { key: 'name', label: 'サロン名 *', placeholder: 'SALON de BEAUTÉ' },
              { key: 'area', label: 'エリア *', placeholder: '渋谷' },
              { key: 'address', label: '住所 *', placeholder: '東京都渋谷区...' },
              { key: 'nearest_station', label: '最寄り駅', placeholder: '渋谷駅' },
              { key: 'phone', label: '電話番号', placeholder: '03-xxxx-xxxx' },
            ].map(field => (
              <div key={field.key} className="mb-3">
                <label className="text-xs font-bold text-gray-600">{field.label}</label>
                <input
                  value={(salonForm as any)[field.key]}
                  onChange={e => setSalonForm({ ...salonForm, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  className="w-full border rounded-lg p-2 mt-1 text-sm"
                />
              </div>
            ))}
            <div className="mb-4">
              <label className="text-xs font-bold text-gray-600">説明文</label>
              <textarea
                value={salonForm.description}
                onChange={e => setSalonForm({ ...salonForm, description: e.target.value })}
                placeholder="サロンの説明を入力..."
                className="w-full border rounded-lg p-2 mt-1 text-sm h-24 resize-none"
              />
            </div>
            <button onClick={saveSalon} className="w-full bg-pink-500 text-white py-3 rounded-lg font-bold">
              {salon ? '更新する' : '登録する'}
            </button>
          </div>
        )}

        {/* メニュータブ */}
        {tab === 'menus' && (
          <div>
            <div className="bg-white rounded-xl shadow p-4 mb-4">
              <h2 className="font-bold text-lg mb-3">メニューを追加</h2>
              <input value={menuForm.name} onChange={e => setMenuForm({ ...menuForm, name: e.target.value })}
                placeholder="メニュー名（例：カット+カラー）" className="w-full border rounded-lg p-2 mb-2 text-sm" />
              <div className="flex gap-2 mb-3">
                <input value={menuForm.price} onChange={e => setMenuForm({ ...menuForm, price: e.target.value })}
                  placeholder="料金（円）" type="number" className="flex-1 border rounded-lg p-2 text-sm" />
                <input value={menuForm.duration} onChange={e => setMenuForm({ ...menuForm, duration: e.target.value })}
                  placeholder="所要時間（分）" type="number" className="flex-1 border rounded-lg p-2 text-sm" />
              </div>
              <button onClick={addMenu} className="w-full bg-pink-500 text-white py-2 rounded-lg font-bold text-sm">
                ＋ 追加する
              </button>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="font-bold text-lg mb-3">登録済みメニュー（{menus.length}件）</h2>
              {menus.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">メニューがまだありません</p>
              ) : menus.map(menu => (
                <div key={menu.id} className="flex justify-between items-center p-3 border rounded-lg mb-2">
                  <div>
                    <p className="font-bold text-sm">{menu.name}</p>
                    <p className="text-xs text-gray-500">¥{menu.price.toLocaleString()} / {menu.duration}分</p>
                  </div>
                  <button onClick={() => deleteMenu(menu.id)} className="text-red-400 text-xs px-2 py-1 border border-red-200 rounded">削除</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 予約一覧タブ */}
        {tab === 'reservations' && (
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-bold text-lg mb-3">予約一覧（{reservations.length}件）</h2>
            {reservations.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">予約がまだありません</p>
            ) : reservations.map(res => (
              <div key={res.id} className="p-3 border rounded-lg mb-2">
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-xs px-2 py-1 rounded-full font-bold ${statusColor[res.status]}`}>
                    {statusLabel[res.status]}
                  </span>
                  <span className="text-xs text-gray-400">{new Date(res.reserved_at).toLocaleString('ja-JP')}</span>
                </div>
                <p className="text-sm font-bold">{res.menus?.name}</p>
                <p className="text-xs text-gray-500">¥{res.menus?.price?.toLocaleString()}</p>
                {res.status === 'pending' && (
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => updateReservationStatus(res.id, 'confirmed')}
                      className="flex-1 bg-green-100 text-green-700 text-xs py-1 rounded font-bold">確認する</button>
                    <button onClick={() => updateReservationStatus(res.id, 'cancelled')}
                      className="flex-1 bg-red-100 text-red-700 text-xs py-1 rounded font-bold">キャンセル</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}