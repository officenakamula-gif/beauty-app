'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { sendEmail } from '@/lib/email'

const grad = 'linear-gradient(45deg,#F77737,#E1306C,#833AB4,#5851DB)'
const gradText: any = { background: grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }
const card: any = { background: 'white', borderRadius: 16, border: '1px solid #DBDBDB', padding: 24, marginBottom: 16 }
const inputStyle: any = { width: '100%', border: '1.5px solid #DBDBDB', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontFamily: 'inherit', outline: 'none', color: '#111', background: '#FAFAFA' }
const labelStyle: any = { fontSize: 12, fontWeight: 700, color: '#737373', display: 'block', marginBottom: 6 }

export default function AdminPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'stats' | 'salons' | 'users' | 'notify'>('stats')

  // 統計
  const [stats, setStats] = useState({ salons: 0, users: 0, reservations: 0, pendingRes: 0 })

  // サロン
  const [salons, setSalons] = useState<any[]>([])
  const [salonSearch, setSalonSearch] = useState('')

  // ユーザー
  const [users, setUsers] = useState<any[]>([])
  const [userSearch, setUserSearch] = useState('')

  // お知らせ
  const [notifyForm, setNotifyForm] = useState({
    target_type: 'all' as 'all' | 'user' | 'salon' | 'specific',
    target_id: '',
    target_email: '',
    title: '',
    body: '',
  })
  const [notifySending, setNotifySending] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (prof?.role !== 'admin') { router.push('/'); return }

    setUser(user)
    await Promise.all([fetchStats(), fetchSalons(), fetchUsers(), fetchNotifications()])
    setLoading(false)
  }

  const fetchStats = async () => {
    const [{ count: salonsCount }, { count: usersCount }, { count: resCount }, { count: pendingCount }] = await Promise.all([
      supabase.from('salons').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
      supabase.from('reservations').select('*', { count: 'exact', head: true }),
      supabase.from('reservations').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    ])
    setStats({
      salons: salonsCount || 0,
      users: usersCount || 0,
      reservations: resCount || 0,
      pendingRes: pendingCount || 0,
    })
  }

  const fetchSalons = async () => {
    const { data: salonData } = await supabase.from('salons').select('*').order('created_at', { ascending: false })
    if (!salonData) { setSalons([]); return }
    // オーナーのメールアドレスを取得して結合
    const ownerIds = [...new Set(salonData.map((s: any) => s.owner_id).filter(Boolean))]
    const { data: profileData } = await supabase.from('profiles').select('id, username, full_name').in('id', ownerIds)
    const profileMap: Record<string, any> = {}
    for (const p of profileData || []) profileMap[p.id] = p
    setSalons(salonData.map((s: any) => ({ ...s, ownerProfile: profileMap[s.owner_id] || null })))
  }

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').in('role', ['user', 'salon']).order('created_at', { ascending: false })
    setUsers(data || [])
  }

  const fetchNotifications = async () => {
    const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(30)
    setNotifications(data || [])
  }

  const toggleSalonActive = async (salonId: string, current: boolean) => {
    await supabase.from('salons').update({ is_active: !current }).eq('id', salonId)
    setSalons(salons.map(s => s.id === salonId ? { ...s, is_active: !current } : s))
  }

  const sendNotification = async () => {
    if (!notifyForm.title || !notifyForm.body) { alert('タイトルと本文を入力してください'); return }
    setNotifySending(true)

    try {
      // notificationsテーブルに保存
      await supabase.from('notifications').insert({
        target_type: notifyForm.target_type,
        target_id: notifyForm.target_type === 'specific' ? notifyForm.target_id || null : null,
        title: notifyForm.title,
        body: notifyForm.body,
      })

      // メール送信
      const subject = `【Salon de Beauty】${notifyForm.title}`
      const html = `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;">
          <div style="background:linear-gradient(45deg,#F77737,#E1306C,#833AB4,#5851DB);padding:20px;text-align:center;">
            <h1 style="color:white;margin:0;font-size:20px;">Salon de Beauty</h1>
          </div>
          <div style="padding:24px;">
            <h2 style="font-size:16px;color:#111;margin-bottom:12px;">${notifyForm.title}</h2>
            <div style="font-size:14px;color:#444;line-height:1.8;white-space:pre-wrap;">${notifyForm.body}</div>
            <hr style="margin:24px 0;border:none;border-top:1px solid #DBDBDB;" />
            <p style="font-size:11px;color:#9ca3af;">Salon de Beauty 運営事務局</p>
          </div>
        </div>
      `

      if (notifyForm.target_type === 'all') {
        // 全ユーザー・全サロンにメール
        const allEmails = users.filter(u => !u.is_deleted).map(u => u.username).filter(Boolean)
        for (const email of allEmails) {
          await sendEmail(email, subject, html)
        }
        alert(`${allEmails.length}件送信しました`)

      } else if (notifyForm.target_type === 'user') {
        const emails = users.filter(u => u.role === 'user' && !u.is_deleted).map(u => u.username).filter(Boolean)
        for (const email of emails) {
          await sendEmail(email, subject, html)
        }
        alert(`${emails.length}件送信しました`)

      } else if (notifyForm.target_type === 'salon') {
        const emails = users.filter(u => u.role === 'salon' && !u.is_deleted).map(u => u.username).filter(Boolean)
        for (const email of emails) {
          await sendEmail(email, subject, html)
        }
        alert(`${emails.length}件送信しました`)

      } else if (notifyForm.target_type === 'specific') {
        if (!notifyForm.target_email) { alert('送信先メールアドレスを入力してください'); setNotifySending(false); return }
        await sendEmail(notifyForm.target_email, subject, html)
        alert('送信しました')
      }

      setNotifyForm({ target_type: 'all', target_id: '', target_email: '', title: '', body: '' })
      await fetchNotifications()

    } catch (err: any) {
      alert('エラー: ' + err.message)
    }
    setNotifySending(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 13, color: '#737373' }}>読み込み中...</div>
    </div>
  )

  const tabList = [
    { key: 'stats', label: '統計' },
    { key: 'salons', label: `サロン（${stats.salons}）` },
    { key: 'users', label: `ユーザー（${stats.users}）` },
    { key: 'notify', label: 'お知らせ送信' },
  ]

  const filteredSalons = salons.filter(s =>
    !salonSearch || s.name?.includes(salonSearch) || s.area?.includes(salonSearch)
  )
  const filteredUsers = users.filter(u =>
    !userSearch || u.username?.includes(userSearch) || u.full_name?.includes(userSearch)
  )

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA' }}>

      {/* Header */}
      <header style={{ background: 'white', borderBottom: '1px solid #DBDBDB', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/" style={{ fontSize: 18, fontWeight: 700, textDecoration: 'none', ...gradText }}>Salon de Beauty</Link>
          <span style={{ fontSize: 11, fontWeight: 700, background: '#FFEBEE', color: '#C62828', padding: '2px 10px', borderRadius: 100 }}>管理者</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: '#737373' }}>{user?.email}</span>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
            style={{ fontSize: 12, border: '1.5px solid #DBDBDB', background: 'none', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', color: '#262626' }}>
            ログアウト
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ background: 'white', borderBottom: '1px solid #DBDBDB', padding: '0 32px', display: 'flex' }}>
        {tabList.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            style={{ padding: '12px 20px', fontSize: 12, fontWeight: 700, border: 'none', borderBottom: tab === t.key ? '2px solid #E1306C' : '2px solid transparent', background: 'none', cursor: 'pointer', color: tab === t.key ? '#111' : '#737373', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 32px' }}>

        {/* ── 統計タブ ── */}
        {tab === 'stats' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
              {[
                { label: '掲載サロン数', value: stats.salons, color: '#833AB4' },
                { label: '登録ユーザー数', value: stats.users, color: '#E1306C' },
                { label: '総予約数', value: stats.reservations, color: '#F77737' },
                { label: '承認待ち予約', value: stats.pendingRes, color: '#F57F17' },
              ].map(s => (
                <div key={s.label} style={{ background: 'white', borderRadius: 16, border: '1px solid #DBDBDB', padding: '20px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#737373', marginBottom: 8 }}>{s.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#737373', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #DBDBDB' }}>最近のお知らせ送信履歴</div>
              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#737373', fontSize: 13, padding: '20px 0' }}>送信履歴はありません</div>
              ) : notifications.slice(0, 5).map(n => (
                <div key={n.id} style={{ padding: '10px 0', borderBottom: '1px solid #F2F2F2' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: '#F3E5F5', color: '#6A1B9A', marginRight: 8 }}>
                        {n.target_type === 'all' ? '全員' : n.target_type === 'user' ? 'ユーザー' : n.target_type === 'salon' ? 'サロン' : '個別'}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{n.title}</span>
                    </div>
                    <span style={{ fontSize: 11, color: '#737373' }}>{new Date(n.created_at).toLocaleDateString('ja-JP')}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#737373', marginTop: 4, paddingLeft: 4 }}>{n.body.slice(0, 60)}{n.body.length > 60 ? '...' : ''}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── サロン管理タブ ── */}
        {tab === 'salons' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <input value={salonSearch} onChange={e => setSalonSearch(e.target.value)}
                placeholder="サロン名・エリアで検索"
                style={{ ...inputStyle, maxWidth: 320 }} />
            </div>
            <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#737373', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #DBDBDB' }}>
                サロン一覧（{filteredSalons.length}件）
              </div>
              {filteredSalons.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#737373', fontSize: 13, padding: '20px 0' }}>サロンがありません</div>
              ) : filteredSalons.map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #F2F2F2' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>{s.name}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: s.is_active ? '#E8F5E9' : '#FFEBEE', color: s.is_active ? '#2E7D32' : '#C62828' }}>
                        {s.is_active ? '掲載中' : '非掲載'}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#737373' }}>
                      {s.genre}　{s.area}　{s.address}
                    </div>
                    <div style={{ fontSize: 11, color: '#737373' }}>
                      {s.ownerProfile?.full_name && <span>{s.ownerProfile.full_name}　</span>}
                      {s.ownerProfile?.username || '不明'}
                    </div>
                    <div style={{ fontSize: 10, color: '#BDBDBD' }}>
                      登録：{new Date(s.created_at).toLocaleDateString('ja-JP')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 12 }}>
                    <Link href={`/salons/${s.id}`} target="_blank"
                      style={{ fontSize: 11, border: '1.5px solid #DBDBDB', background: 'none', padding: '5px 12px', borderRadius: 8, cursor: 'pointer', color: '#262626', textDecoration: 'none', fontWeight: 700 }}>
                      表示
                    </Link>
                    <button onClick={() => toggleSalonActive(s.id, s.is_active)}
                      style={{ fontSize: 11, fontWeight: 700, border: s.is_active ? '1.5px solid #FFCDD2' : '1.5px solid #A5D6A7', background: s.is_active ? '#FFEBEE' : '#E8F5E9', color: s.is_active ? '#C62828' : '#2E7D32', padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {s.is_active ? '掲載停止' : '掲載再開'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ユーザー管理タブ ── */}
        {tab === 'users' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                placeholder="メールアドレス・氏名で検索"
                style={{ ...inputStyle, maxWidth: 320 }} />
            </div>
            <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#737373', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #DBDBDB' }}>
                ユーザー一覧（{filteredUsers.length}件）
              </div>
              {filteredUsers.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#737373', fontSize: 13, padding: '20px 0' }}>ユーザーがいません</div>
              ) : filteredUsers.map(u => (
                <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F2F2F2' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      {u.full_name && <span style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{u.full_name}</span>}
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: u.role === 'salon' ? '#F3E5F5' : '#E3F2FD', color: u.role === 'salon' ? '#6A1B9A' : '#1565C0' }}>
                        {u.role === 'salon' ? 'サロン' : 'ユーザー'}
                      </span>
                      {u.is_deleted && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: '#FFEBEE', color: '#C62828' }}>退会済み</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#737373' }}>{u.username}</div>
                    {u.phone && <div style={{ fontSize: 11, color: '#737373' }}>{u.phone}</div>}
                    <div style={{ fontSize: 10, color: '#BDBDBD' }}>登録：{new Date(u.created_at).toLocaleDateString('ja-JP')}</div>
                  </div>
                  <button
                    onClick={() => {
                      setNotifyForm({ ...notifyForm, target_type: 'specific', target_email: u.username, title: '', body: '' })
                      setTab('notify')
                    }}
                    style={{ fontSize: 11, fontWeight: 700, border: '1.5px solid #DBDBDB', background: 'none', padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', color: '#262626', flexShrink: 0 }}>
                    メール送信
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── お知らせ送信タブ ── */}
        {tab === 'notify' && (
          <div>
            <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#737373', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #DBDBDB' }}>お知らせ・メール送信</div>

              {/* 送信対象 */}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>送信対象</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                  {[
                    { key: 'all', label: '全員' },
                    { key: 'user', label: 'ユーザー全員' },
                    { key: 'salon', label: 'サロン全員' },
                    { key: 'specific', label: '個別指定' },
                  ].map(t => (
                    <button key={t.key} onClick={() => setNotifyForm({ ...notifyForm, target_type: t.key as any })}
                      style={{ padding: '7px 16px', fontSize: 12, fontWeight: 700, border: notifyForm.target_type === t.key ? 'none' : '1.5px solid #DBDBDB', borderRadius: 100, background: notifyForm.target_type === t.key ? grad : 'white', color: notifyForm.target_type === t.key ? 'white' : '#737373', cursor: 'pointer', fontFamily: 'inherit' }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 個別指定の場合 */}
              {notifyForm.target_type === 'specific' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>送信先メールアドレス</label>
                  <input
                    type="email"
                    value={notifyForm.target_email}
                    onChange={e => setNotifyForm({ ...notifyForm, target_email: e.target.value })}
                    placeholder="example@email.com"
                    style={inputStyle}
                  />
                </div>
              )}

              {/* タイトル */}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>タイトル</label>
                <input
                  value={notifyForm.title}
                  onChange={e => setNotifyForm({ ...notifyForm, title: e.target.value })}
                  placeholder="例：重要なお知らせ"
                  style={inputStyle}
                />
              </div>

              {/* 本文 */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>本文</label>
                <textarea
                  value={notifyForm.body}
                  onChange={e => setNotifyForm({ ...notifyForm, body: e.target.value })}
                  placeholder="本文を入力してください..."
                  rows={8}
                  style={{ ...inputStyle, resize: 'vertical' as const, lineHeight: 1.8 }}
                />
              </div>

              {/* 送信件数プレビュー */}
              <div style={{ marginBottom: 16, fontSize: 12, color: '#737373' }}>
                {notifyForm.target_type === 'all' && `送信対象：${users.filter(u => !u.is_deleted).length}件`}
                {notifyForm.target_type === 'user' && `送信対象：${users.filter(u => u.role === 'user' && !u.is_deleted).length}件`}
                {notifyForm.target_type === 'salon' && `送信対象：${users.filter(u => u.role === 'salon' && !u.is_deleted).length}件`}
                {notifyForm.target_type === 'specific' && notifyForm.target_email && `送信対象：${notifyForm.target_email}`}
              </div>

              <button onClick={sendNotification} disabled={notifySending}
                style={{ width: '100%', background: grad, color: 'white', border: 'none', padding: 13, borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: notifySending ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: notifySending ? 0.6 : 1 }}>
                {notifySending ? '送信中...' : '送信する'}
              </button>
            </div>

            {/* 送信履歴 */}
            <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#737373', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #DBDBDB' }}>送信履歴（直近30件）</div>
              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#737373', fontSize: 13, padding: '20px 0' }}>送信履歴はありません</div>
              ) : notifications.map(n => (
                <div key={n.id} style={{ padding: '12px 0', borderBottom: '1px solid #F2F2F2' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: '#F3E5F5', color: '#6A1B9A' }}>
                        {n.target_type === 'all' ? '全員' : n.target_type === 'user' ? 'ユーザー' : n.target_type === 'salon' ? 'サロン' : '個別'}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{n.title}</span>
                    </div>
                    <span style={{ fontSize: 11, color: '#737373', flexShrink: 0, marginLeft: 12 }}>{new Date(n.created_at).toLocaleString('ja-JP')}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#737373', lineHeight: 1.7, paddingLeft: 4, whiteSpace: 'pre-wrap' as const }}>
                    {n.body.slice(0, 100)}{n.body.length > 100 ? '...' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}