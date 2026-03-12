'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function MyPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [reservations, setReservations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    setUser(user)
    const { data } = await supabase
      .from('reservations')
      .select('*, salons(name, area), menus(name, price)')
      .eq('user_id', user.id)
      .order('reserved_at', { ascending: false })
    setReservations(data || [])
    setLoading(false)
  }

  const cancelReservation = async (id: string) => {
    if (!confirm('予約をキャンセルしますか？')) return
    await supabase.from('reservations').update({ status: 'cancelled' }).eq('id', id)
    setReservations(reservations.map(r => r.id === id ? { ...r, status: 'cancelled' } : r))
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">読み込み中...</p>
    </div>
  )

  const statusConfig: any = {
    pending:   { label: '承認待ち',    color: 'bg-yellow-100 text-yellow-700', icon: '⏳' },
    confirmed: { label: '予約確定',    color: 'bg-green-100 text-green-700',   icon: '✅' },
    cancelled: { label: 'キャンセル',  color: 'bg-red-100 text-red-700',       icon: '❌' },
    completed: { label: '来店完了',    color: 'bg-gray-100 text-gray-600',     icon: '⭐' },
    expired:   { label: 'タイムアウト', color: 'bg-gray-100 text-gray-400',    icon: '⏱' },
  }

  const activeReservations = reservations.filter(r => ['pending', 'confirmed'].includes(r.status))
  const pastReservations = reservations.filter(r => ['cancelled', 'completed', 'expired'].includes(r.status))

  const ReservationCard = ({ res, isPast }: { res: any, isPast: boolean }) => (
    <div className={`bg-white rounded-lg shadow p-4 mb-3 ${isPast ? 'opacity-75' : ''}`}>
      <div className="flex justify-between items-center mb-2">
        <span className={`text-sm px-3 py-1 rounded-full font-bold ${statusConfig[res.status].color}`}>
          {statusConfig[res.status].icon} {statusConfig[res.status].label}
        </span>
      </div>
      <p className="font-bold text-base">{res.salons?.name}</p>
      <p className="text-sm text-gray-500">📍 {res.salons?.area}</p>
      <p className="text-base font-bold text-gray-700 mt-1">
        📅 {new Date(res.reserved_at).toLocaleString('ja-JP')}
      </p>
      <p className="text-sm text-gray-600 mt-1">{res.menus?.name}</p>
      <p className="text-base text-pink-600 font-bold">¥{res.menus?.price?.toLocaleString()}</p>

      {!isPast && res.status === 'pending' && (
        <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
          <p className="text-sm text-yellow-700">
            ⏳ サロンの承認をお待ちください。3日以内に承認がない場合は自動キャンセルになります。
          </p>
          <p className="text-sm text-gray-400 mt-1">
            タイムアウト：{new Date(res.timeout_at).toLocaleString('ja-JP')}
          </p>
          <button onClick={() => cancelReservation(res.id)}
            className="mt-2 text-sm text-red-500 border border-red-200 px-3 py-1 rounded">
            予約をキャンセルする
          </button>
        </div>
      )}

      {!isPast && res.status === 'confirmed' && (
        <div className="mt-3 p-3 bg-green-50 rounded-lg">
          <p className="text-sm text-green-700">✅ 予約が確定しました！ご来店をお楽しみに。</p>
          <button onClick={() => cancelReservation(res.id)}
            className="mt-2 text-sm text-red-500 border border-red-200 px-3 py-1 rounded">
            予約をキャンセルする
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-pink-600 text-white">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-2xl font-black">💄 BeautyBook</Link>
          <p className="text-sm opacity-75">{user?.email}</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <h2 className="text-xl font-bold mb-4">マイページ</h2>

        <div className="mb-6">
          <h3 className="font-bold text-gray-700 mb-3">📅 進行中の予約（{activeReservations.length}件）</h3>
          {activeReservations.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-400">
              <p>進行中の予約はありません</p>
              <Link href="/" className="text-pink-600 text-sm mt-2 block">サロンを探す →</Link>
            </div>
          ) : activeReservations.map(res => <ReservationCard key={res.id} res={res} isPast={false} />)}
        </div>

        {pastReservations.length > 0 && (
          <div>
            <h3 className="font-bold text-gray-700 mb-3">📋 過去の予約</h3>
            {pastReservations.map(res => <ReservationCard key={res.id} res={res} isPast={true} />)}
          </div>
        )}
      </div>
    </div>
  )
}