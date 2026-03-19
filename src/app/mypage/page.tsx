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
  const [withdrawing, setWithdrawing] = useState(false)

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    setUser(user)
    const { data } = await supabase
      .from('reservations')
      .select('*, salons(name, area), menus(name, price), stylists(name)')
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

  // 退会処理（データは残す・フラグのみ更新）
  const handleWithdraw = async () => {
    if (!confirm('退会しますか？\n\n予約履歴などのデータは保持されますが、ログインできなくなります。\nこの操作は取り消せません。')) return
    if (!confirm('本当に退会しますか？')) return
    setWithdrawing(true)
    try {
      await supabase.from('profiles').update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      }).eq('id', user.id)
      await supabase.auth.signOut()
      alert('退会処理が完了しました。ご利用ありがとうございました。')
      router.push('/')
    } catch (err: any) {
      alert('エラーが発生しました: ' + err.message)
      setWithdrawing(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 13, color: '#737373' }}>読み込み中...</div>
    </div>
  )

  const statusConfig: any = {
    pending:   { label: '承認待ち',    bg: '#FFF8E1', color: '#F57F17' },
    confirmed: { label: '予約確定',    bg: '#E8F5E9', color: '#2E7D32' },
    cancelled: { label: 'キャンセル',  bg: '#FFEBEE', color: '#C62828' },
    completed: { label: '来店完了',    bg: '#F3E5F5', color: '#6A1B9A' },
    expired:   { label: 'タイムアウト', bg: '#FAFAFA', color: '#737373' },
  }

  const activeRes = reservations.filter(r => ['pending', 'confirmed'].includes(r.status))
  const pastRes = reservations.filter(r => ['cancelled', 'completed', 'expired'].includes(r.status))

  const gradText = { background: 'linear-gradient(45deg,#F77737,#E1306C,#833AB4,#5851DB)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' } as any

  const Card = ({ res, past }: { res: any, past: boolean }) => (
    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #DBDBDB', padding: '18px 20px', marginBottom: 10, opacity: past ? 0.65 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 12px', borderRadius: 100, background: statusConfig[res.status]?.bg, color: statusConfig[res.status]?.color }}>
          {statusConfig[res.status]?.label}
        </span>
        <span style={{ fontSize: 11, color: '#737373' }}>{new Date(res.reserved_at).toLocaleString('ja-JP')}</span>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{res.salons?.name}</div>
      <div style={{ fontSize: 12, color: '#737373', lineHeight: 1.8 }}>
        {res.salons?.area}<br />
        {res.menus?.name}
        {res.stylists?.name && <>&nbsp;&nbsp;/&nbsp;&nbsp;担当：{res.stylists.name}</>}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 8, ...gradText }}>¥{res.menus?.price?.toLocaleString()}</div>

      {!past && res.status === 'pending' && (
        <div style={{ marginTop: 12, background: '#FFF8E1', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#8A6914', lineHeight: 1.6 }}>
          サロンの承認をお待ちください。タイムアウト：{new Date(res.timeout_at).toLocaleString('ja-JP')}
        </div>
      )}
      {!past && res.status === 'confirmed' && (
        <div style={{ marginTop: 12, background: '#E8F5E9', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#2E7D32', fontWeight: 500 }}>
          予約が確定しました。ご来店をお楽しみに。
        </div>
      )}
      {!past && (
        <button onClick={() => cancelReservation(res.id)}
          style={{ marginTop: 10, fontSize: 12, color: '#737373', border: '1.5px solid #DBDBDB', background: 'none', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
          予約をキャンセルする
        </button>
      )}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA' }}>
      <header style={{ background: 'white', borderBottom: '1px solid #DBDBDB', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ fontSize: 20, fontWeight: 700, textDecoration: 'none', ...gradText }}>Salon de Beauty</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: '#737373' }}>{user?.email}</span>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
            style={{ fontSize: 12, border: '1.5px solid #DBDBDB', background: 'none', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', color: '#262626' }}>
            ログアウト
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 32px' }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 24, ...gradText }}>My Page</div>

        <div style={{ fontSize: 11, fontWeight: 700, color: '#737373', letterSpacing: '0.1em', marginBottom: 12 }}>進行中の予約</div>
        {activeRes.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #DBDBDB', padding: 40, textAlign: 'center', color: '#737373', marginBottom: 10 }}>
            進行中の予約はありません
            <div><Link href="/" style={{ fontSize: 12, color: '#E1306C', fontWeight: 700, textDecoration: 'none', marginTop: 8, display: 'inline-block' }}>サロンを探す →</Link></div>
          </div>
        ) : activeRes.map(r => <Card key={r.id} res={r} past={false} />)}

        {pastRes.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#737373', letterSpacing: '0.1em', marginBottom: 12, marginTop: 24 }}>過去の予約</div>
            {pastRes.map(r => <Card key={r.id} res={r} past={true} />)}
          </>
        )}

        {/* 退会セクション */}
        <div style={{ marginTop: 48, borderTop: '1px solid #DBDBDB', paddingTop: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#737373', marginBottom: 8 }}>アカウント</div>
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #DBDBDB', padding: '20px 24px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#262626', marginBottom: 6 }}>退会する</div>
            <div style={{ fontSize: 12, color: '#737373', lineHeight: 1.8, marginBottom: 16 }}>
              退会してもご予約履歴などのデータは保持されます。<br />
              退会後は同じメールアドレスで再登録が可能です。
            </div>
            <button
              onClick={handleWithdraw}
              disabled={withdrawing}
              style={{ fontSize: 12, color: '#C62828', border: '1.5px solid #FFCDD2', background: '#FFEBEE', padding: '8px 20px', borderRadius: 8, cursor: withdrawing ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontWeight: 700, opacity: withdrawing ? 0.6 : 1 }}>
              {withdrawing ? '処理中...' : '退会する'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}