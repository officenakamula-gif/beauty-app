'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import BlockButton from '@/components/BlockButton'
import { sendEmail, emailTemplates } from '@/lib/email'
import { DAY_NAMES, getAvailableSlots, getAllSlots } from '@/lib/availability'
import Link from 'next/link'

// ─── 最近見たサロンをlocalStorageで管理 ───────────────────────────────
const RECENT_KEY = 'recentSalons'
const MAX_RECENT = 5

function saveRecentSalon(salon: { id: string; name: string; area: string }) {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    const list: typeof salon[] = raw ? JSON.parse(raw) : []
    const filtered = list.filter(s => s.id !== salon.id)
    const next = [salon, ...filtered].slice(0, MAX_RECENT)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {}
}

function loadRecentSalons(): { id: string; name: string; area: string }[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}
// ─────────────────────────────────────────────────────────────────────────

// ─── スタイル定数 ─────────────────────────────────────────────────────
const grad = 'linear-gradient(45deg,#F77737,#E1306C,#833AB4,#5851DB)'
const gradText: any = { background: grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }

const card: any = {
  background: 'white',
  borderRadius: 12,
  border: '1px solid #DBDBDB',
  padding: '16px',
  marginBottom: 12,
}

const sectionTitle: any = {
  fontSize: 13,
  fontWeight: 700,
  color: '#262626',
  paddingBottom: 10,
  marginBottom: 12,
  borderBottom: '1px solid #DBDBDB',
}

const inputStyle: any = {
  width: '100%',
  border: '1.5px solid #DBDBDB',
  borderRadius: 10,
  padding: '10px 14px',
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
  color: '#111',
  background: '#FAFAFA',
}
// ─────────────────────────────────────────────────────────────────────────

export default function SalonDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()

  const [salon, setSalon] = useState<any>(null)
  const [menus, setMenus] = useState<any[]>([])
  const [stylists, setStylists] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [infoTab, setInfoTab] = useState<'info' | 'styles' | 'booking' | 'stylists'>('info')
  const [recentSalons, setRecentSalons] = useState<{ id: string; name: string; area: string }[]>([])
  const [salonPhotos, setSalonPhotos] = useState<any[]>([])
  const [stylistPhotos, setStylistPhotos] = useState<any[]>([])

  const [step, setStep] = useState(1)
  const [selectedMenu, setSelectedMenu] = useState<any>(null)
  const [selectedStylist, setSelectedStylist] = useState<any>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [requestImageFile, setRequestImageFile] = useState<File | null>(null)
  const [requestImagePreview, setRequestImagePreview] = useState('')
  const [requestImageUploading, setRequestImageUploading] = useState(false)

  const [schedules, setSchedules] = useState<any[]>([])
  const [reservations, setReservations] = useState<any[]>([])
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const [isFirstVisit, setIsFirstVisit] = useState<boolean | null>(null) // null=未判定

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user)
      if (data.user) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('full_name, display_name, username')
          .eq('id', data.user.id)
          .single()
        setUserProfile(prof)
      }
    })
    fetchSalonData()
    setRecentSalons(loadRecentSalons())
  }, [])

  const fetchSalonData = async () => {
    const { data: salonData } = await supabase.from('salons').select('*').eq('id', id).single()
    if (salonData) {
      setSalon(salonData)
      // 最近見たサロンに保存
      saveRecentSalon({ id: salonData.id, name: salonData.name, area: salonData.area || '' })
      setRecentSalons(loadRecentSalons())
    }
    const { data: menuData } = await supabase.from('menus').select('*').eq('salon_id', id).order('price')
    setMenus(menuData || [])
    const { data: stylistData } = await supabase.from('stylists').select('*').eq('salon_id', id).eq('is_active', true)
    setStylists(stylistData || [])
    const { data: salonPhotoData } = await supabase.from('salon_photos').select('*').eq('salon_id', id).order('created_at', { ascending: false })
    setSalonPhotos(salonPhotoData || [])
    const { data: stylistPhotoData } = await supabase.from('stylist_photos').select('*').eq('salon_id', id).order('created_at', { ascending: false })
    setStylistPhotos(stylistPhotoData || [])
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (currentUser) {
      const { data: blockData } = await supabase
        .from('blocks').select('id')
        .eq('blocked_id', currentUser.id).eq('blocked_salon_id', id).maybeSingle()
      setIsBlocked(!!blockData)
      // 初回来店判定：completed の予約が0件なら初回
      const { count } = await supabase
        .from('reservations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', currentUser.id)
        .eq('salon_id', id)
        .eq('status', 'completed')
      setIsFirstVisit((count ?? 0) === 0)
    } else {
      setIsFirstVisit(null) // 未ログイン
    }
  }

  const loadAvailability = async (stylistId: string | null) => {
    setAvailabilityLoading(true)
    const now = new Date()
    const future = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
    if (stylistId) {
      const { data: schData } = await supabase.from('stylist_schedules').select('*').eq('stylist_id', stylistId)
      setSchedules(schData || [])
      const { data: resData } = await supabase.from('reservations')
        .select('*, menus(duration)').eq('stylist_id', stylistId)
        .not('status', 'in', '("cancelled","expired")')
        .gte('reserved_at', now.toISOString()).lte('reserved_at', future.toISOString())
      setReservations(resData || [])
    } else {
      const stylistIds = stylists.map(s => s.id)
      if (stylistIds.length > 0) {
        const { data: schData } = await supabase.from('stylist_schedules').select('*').in('stylist_id', stylistIds)
        setSchedules(schData || [])
      } else { setSchedules([]) }
      const { data: resData } = await supabase.from('reservations')
        .select('*, menus(duration)').eq('salon_id', id).is('stylist_id', null)
        .not('status', 'in', '("cancelled","expired")')
        .gte('reserved_at', now.toISOString()).lte('reserved_at', future.toISOString())
      setReservations(resData || [])
    }
    setAvailabilityLoading(false)
  }

  const handleStylistSelect = async (stylist: any | null) => {
    setSelectedStylist(stylist)
    setSelectedDate('')
    setSelectedTime('')
    await loadAvailability(stylist?.id || null)
    setStep(3)
  }

  const getScheduleForDate = (date: string, stylistId: string): any => {
    const dow = new Date(date + 'T12:00:00+09:00').getDay()
    return schedules.find(s => s.stylist_id === stylistId && s.day_of_week === dow) || null
  }

  const getDateAvailable = (date: string): boolean => {
    if (!selectedMenu) return false
    const interval = salon?.slot_interval || 30
    const duration = selectedMenu.duration
    if (selectedStylist) {
      const schedule = getScheduleForDate(date, selectedStylist.id)
      const stylistRes = reservations.filter(r => r.stylist_id === selectedStylist.id)
      return getAvailableSlots(date, schedule, duration, stylistRes, interval).length > 0
    } else {
      return getAvailableSlots(date, null, duration, reservations, interval).length > 0
    }
  }

  const getDateSlots = (date: string): string[] => {
    if (!selectedMenu) return []
    const interval = salon?.slot_interval || 30
    const duration = selectedMenu.duration
    if (selectedStylist) {
      const schedule = getScheduleForDate(date, selectedStylist.id)
      const stylistRes = reservations.filter(r => r.stylist_id === selectedStylist.id)
      return getAvailableSlots(date, schedule, duration, stylistRes, interval)
    } else {
      return getAvailableSlots(date, null, duration, reservations, interval)
    }
  }

  const getDateAllSlots = (date: string): string[] => {
    if (!selectedMenu) return []
    const interval = salon?.slot_interval || 30
    const duration = selectedMenu.duration
    if (selectedStylist) {
      const schedule = getScheduleForDate(date, selectedStylist.id)
      return getAllSlots(date, schedule, duration, interval)
    } else {
      return getAllSlots(date, null, duration, interval)
    }
  }

  // 60日先が予約上限
  const maxBookingDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 60)
    d.setHours(23, 59, 59, 999)
    return d
  }, [])

  // カレンダーの最大月（今月 or 来月まで）
  const maxMonth = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 60)
    return new Date(d.getFullYear(), d.getMonth(), 1)
  }, [])

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const days: Array<{ date: string; available: boolean; isPast: boolean; isEmpty: boolean }> = []
    for (let i = 0; i < firstDay; i++) {
      days.push({ date: '', available: false, isPast: false, isEmpty: true })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`
      const date = new Date(dateStr + 'T00:00:00+09:00')
      const isPast = date < today
      const isTooFar = date > maxBookingDate
      const available = !isPast && !isTooFar && getDateAvailable(dateStr)
      days.push({ date: dateStr, available, isPast: isPast || isTooFar, isEmpty: false })
    }
    return days
  }, [currentMonth, schedules, reservations, selectedMenu, selectedStylist, stylists, salon, maxBookingDate])

  const nearestAvailableDate = useMemo(() => {
    return calendarDays.find(d => !d.isEmpty && !d.isPast && d.available)?.date || ''
  }, [calendarDays])

  const timeSlots = useMemo(() => {
    if (!selectedDate || !selectedMenu) return []
    return getDateSlots(selectedDate)
  }, [selectedDate, schedules, reservations, selectedMenu, selectedStylist, salon])

  const allTimeSlots = useMemo(() => {
    if (!selectedDate || !selectedMenu) return []
    return getDateAllSlots(selectedDate)
  }, [selectedDate, schedules, selectedMenu, selectedStylist, salon])

  const makeReservation = async () => {
    if (isBlocked) { alert('このサロンへの予約はできません。'); return }
    if (!user) { router.push(`/auth?redirect=/salons/${id}`); return }
    // 初回限定メニューの場合、初回来店かどうか再確認（DBで確定判定）
    if (selectedMenu?.is_first_visit) {
      const { count } = await supabase
        .from('reservations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('salon_id', id)
        .eq('status', 'completed')
      if ((count ?? 0) > 0) {
        alert('このメニューは初回限定です。2回目以降のご来店には適用できません。')
        setBookingLoading(false)
        return
      }
    }
    setBookingLoading(true)
    const slotDate = new Date(`${selectedDate}T${selectedTime}:00+09:00`)
    const now = new Date()
    const diffHours = (slotDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    if (diffHours < 12) {
      alert('この時間帯は受付終了しました（12時間前以降は予約できません）')
      setBookingLoading(false)
      return
    }
    const reservedAt = `${selectedDate}T${selectedTime}:00+09:00`

    // ① 同ユーザーが同サロン・同日時に既存の有効予約がないかチェック
    const { data: userDup } = await supabase
      .from('reservations')
      .select('id')
      .eq('user_id', user.id)
      .eq('salon_id', id)
      .eq('reserved_at', reservedAt)
      .in('status', ['pending', 'confirmed'])
      .maybeSingle()
    if (userDup) {
      alert('この日時はすでに予約済みです。')
      setBookingLoading(false)
      return
    }

    // ② スタイリスト指名がある場合：同スタイリスト・同日時の重複チェック
    if (selectedStylist?.id) {
      const endTime = new Date(new Date(reservedAt).getTime() + selectedMenu.duration * 60 * 1000).toISOString()
      const { data: stylistDup } = await supabase
        .from('reservations')
        .select('id, reserved_at, menus(duration)')
        .eq('stylist_id', selectedStylist.id)
        .in('status', ['pending', 'confirmed'])
        .gte('reserved_at', reservedAt)
        .lt('reserved_at', endTime)
        .maybeSingle()
      if (stylistDup) {
        alert('この時間帯はスタイリストの予約が埋まっています。別の時間をお選びください。')
        setBookingLoading(false)
        return
      }
    }

    // ③ リクエスト写真アップロード
    let requestImageUrl: string | null = null
    if (requestImageFile) {
      setRequestImageUploading(true)
      const ext = requestImageFile.name.split('.').pop()
      const fileName = `reservation-requests/${user.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('salon-images')
        .upload(fileName, requestImageFile, { upsert: true })
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('salon-images').getPublicUrl(fileName)
        requestImageUrl = urlData.publicUrl
      }
      setRequestImageUploading(false)
    }

    const { error } = await supabase.from('reservations').insert({
      user_id: user.id, salon_id: id,
      menu_id: selectedMenu.id,
      stylist_id: selectedStylist?.id || null,
      reserved_at: reservedAt,
      request_image_url: requestImageUrl,
    })
    if (error) { alert('予約失敗: ' + error.message); setBookingLoading(false); return }
    const dateStr = `${selectedDate} ${selectedTime}`
    await sendEmail(
      user.email!,
      ...Object.values(emailTemplates.reservationPending(salon.name, selectedMenu.name, dateStr)) as [string, string]
    )
    const { data: ownerProfile } = await supabase.from('profiles').select('username').eq('id', salon.owner_id).single()
    if (ownerProfile?.username) {
      await sendEmail(
        ownerProfile.username,
        ...Object.values(emailTemplates.newReservation(user.email!, selectedMenu.name, dateStr)) as [string, string]
      )
    }
    setBookingLoading(false)
    alert('✅ 予約申請しました！')
    router.push('/mypage')
  }

  if (!salon) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#737373', fontSize: 13 }}>読み込み中...</div>
    </div>
  )

  // ユーザー表示名
  const displayName = userProfile?.display_name || userProfile?.full_name || user?.email?.split('@')[0] || ''

  // 右カラムのリンク
  const rightLinks = [
    { label: 'マイページトップ', href: '/mypage' },
    { label: '予約履歴一覧', href: '/mypage' },
    { label: 'プロフィール設定', href: '/mypage' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA', fontFamily: "'Noto Sans JP', sans-serif" }}>

      {/* ── ヘッダー ── */}
      <header className="sp-header" style={{ background: 'white', borderBottom: '1px solid #DBDBDB', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ fontSize: 18, fontWeight: 700, textDecoration: 'none', ...gradText }}>Salon de Beauty</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {user ? (
            <>
              <Link href="/mypage" style={{ fontSize: 12, color: '#737373', textDecoration: 'none' }}>マイページ</Link>
              <button onClick={() => router.back()} style={{ fontSize: 12, border: '1px solid #DBDBDB', background: 'none', padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', color: '#262626' }}>戻る</button>
            </>
          ) : (
            <button onClick={() => router.push(`/auth?redirect=/salons/${id}`)} style={{ background: grad, color: 'white', border: 'none', padding: '6px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>ログイン</button>
          )}
        </div>
      </header>

      {/* ── ヒーロー画像グリッド（HPB風） ── */}
      {(() => {
        const images = [salon.top_image, ...(salon.gallery_images || [])].filter(Boolean).slice(0, 5)
        if (images.length === 0) return (
          <div style={{ width: '100%', height: 200, background: 'linear-gradient(135deg,#FFF0F5,#F5F0FF)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 48 }}>💅</span>
          </div>
        )
        return (
          <div className="sp-gallery-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gridTemplateRows: '150px 100px', gap: 2, maxHeight: 252, overflow: 'hidden', background: '#000' }}>
            <img src={images[0]} alt="" style={{ gridRow: '1/3', width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            {[1, 2, 3, 4].map(i => (
              images[i]
                ? <img key={i} src={images[i]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                : <div key={i} style={{ background: '#F0E6F5' }} />
            ))}
          </div>
        )
      })()}

      {/* ── 2カラムレイアウト ── */}
      <div className="sp-salon-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 16, maxWidth: '980px', margin: '0 auto', padding: '16px 16px 40px' }}>

        {/* ════ 左カラム ════ */}
        <div style={{ minWidth: 0 }}>

          {/* サロン名・基本情報カード */}
          <div style={{ ...card, marginBottom: 0, borderRadius: '12px 12px 0 0', borderBottom: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ marginBottom: 6 }}>
                  <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: 'linear-gradient(135deg,#FFF0F5,#F5F0FF)', color: '#833AB4', border: '1px solid #E1306C33' }}>
                    {salon.genre || 'ヘアサロン'}
                  </span>
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 6 }}>{salon.name}</div>
                <div style={{ fontSize: 12, color: '#737373', lineHeight: 2.0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#BDBDBD', letterSpacing: '0.04em', flexShrink: 0 }}>住所</span>
                    <span>{salon.area}　{salon.address}</span>
                  </div>
                  {salon.nearest_station && (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#BDBDBD', letterSpacing: '0.04em', flexShrink: 0 }}>最寄駅</span>
                      <span>{salon.nearest_station}駅近く</span>
                    </div>
                  )}
                  {salon.phone && (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#BDBDBD', letterSpacing: '0.04em', flexShrink: 0 }}>TEL</span>
                      <span>{salon.phone}</span>
                    </div>
                  )}
                </div>
              </div>
              {/* 予約ボタン（左カラム上部） */}
              <button
                onClick={() => { setInfoTab('booking'); setStep(1) }}
                style={{ background: grad, color: 'white', border: 'none', padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0 }}>
                空席確認・予約する
              </button>
            </div>
          </div>

          {/* タブバー */}
          <div style={{ background: 'white', border: '1px solid #DBDBDB', borderTop: 'none', display: 'flex', overflowX: 'auto', marginBottom: 0 }}>
            {([
              { key: 'info', label: 'サロン情報' },
              { key: 'styles', label: 'スタイル' },
              { key: 'booking', label: '予約する' },
              { key: 'stylists', label: 'スタイリスト' },
            ] as const).map(t => (
              <button key={t.key}
                onClick={() => { setInfoTab(t.key); if (t.key === 'booking') setStep(1) }}
                style={{
                  padding: '11px 18px', fontSize: 13, fontWeight: 700, border: 'none',
                  borderBottom: infoTab === t.key ? '2px solid #E1306C' : '2px solid transparent',
                  background: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  color: infoTab === t.key ? '#111' : '#737373', whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* タブコンテンツ */}
          <div style={{ ...card, borderRadius: '0 0 12px 12px', borderTop: 'none' }}>

            {/* ── サロン情報タブ（HPB風） ── */}
            {infoTab === 'info' && (
              <div>

                {/* キャッチコピー・説明文 */}
                {salon.description && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#E1306C', lineHeight: 1.6, marginBottom: 10 }}>
                      {salon.description.split('\n')[0]}
                    </div>
                    <p style={{ fontSize: 13, color: '#444', lineHeight: 2.0 }}>
                      {salon.description.split('\n').slice(1).join('\n') || salon.description}
                    </p>
                  </div>
                )}

                {/* 店内・雰囲気写真（salon_photosのinterior） */}
                {salonPhotos.filter(p => p.category === 'interior').length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={sectionTitle}>店内・雰囲気</div>
                    <div className="sp-photo-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                      {salonPhotos.filter(p => p.category === 'interior').map(photo => (
                        <img key={photo.id} src={photo.image_url} alt={photo.caption || ''} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 8 }} />
                      ))}
                    </div>
                  </div>
                )}

                {/* メニュー一覧（HPB風カード） */}
                {menus.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={sectionTitle}>クーポン・メニュー</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {menus.map(menu => (
                        <div key={menu.id}
                          style={{ border: '1px solid #DBDBDB', borderRadius: 10, overflow: 'hidden', background: 'white' }}>
                          {menu.image_url && (
                            <img src={menu.image_url} alt={menu.name} style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
                          )}
                          <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 3 }}>{menu.name}</div>
                            {menu.description && (
                              <div style={{ fontSize: 12, color: '#737373', lineHeight: 1.6, marginBottom: 4 }}>{menu.description}</div>
                            )}
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                              <span style={{ fontSize: 11, color: '#737373' }}>所要時間：約{menu.duration}分</span>
                            </div>
                          </div>
                          <div style={{ flexShrink: 0, textAlign: 'right' }}>
                            <div style={{ fontSize: 18, fontWeight: 700, ...gradText }}>¥{menu.price.toLocaleString()}</div>
                            <button onClick={() => { setSelectedMenu(menu); setInfoTab('booking'); setStep(2) }}
                              style={{ marginTop: 6, background: grad, color: 'white', border: 'none', padding: '5px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}>
                              このメニューで予約
                            </button>
                          </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* アクセス・基本情報（HPBのサロン情報欄） */}
                <div style={{ marginBottom: 24 }}>
                  <div style={sectionTitle}>アクセス・サロン情報</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
                    {[
                      { label: 'ジャンル', value: [salon.genre, salon.sub_genre].filter(Boolean).join(' / ') },
                      { label: '住所', value: `${salon.area} ${salon.address}` },
                      salon.nearest_station ? { label: '最寄り駅', value: `${salon.nearest_station}駅近く` } : null,
                      salon.phone ? { label: '電話番号', value: salon.phone } : null,
                    ].filter(Boolean).map((row: any) => (
                      <tr key={row.label} style={{ borderBottom: '1px solid #F2F2F2' }}>
                        <td style={{ padding: '9px 0', fontSize: 12, fontWeight: 700, color: '#737373', width: 90, verticalAlign: 'top' as const }}>{row.label}</td>
                        <td style={{ padding: '9px 0', fontSize: 13, color: '#111', lineHeight: 1.7 }}>{row.value}</td>
                      </tr>
                    ))}
                  </table>
                </div>

              </div>
            )}

            {/* ── スタイルタブ ── */}
            {infoTab === 'styles' && (
              <div>
                {/* サロンのスタイル写真 */}
                {salonPhotos.filter(p => p.category === 'style').length > 0 ? (
                  <div style={{ marginBottom: 24 }}>
                    <div style={sectionTitle}>スタイル・施術例</div>
                    <div className="sp-photo-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                      {salonPhotos.filter(p => p.category === 'style').map(photo => (
                        <div key={photo.id}>
                          <img src={photo.image_url} alt={photo.caption || ''} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 10 }} />
                          {photo.caption && <div style={{ fontSize: 11, color: '#737373', marginTop: 4, textAlign: 'center' }}>{photo.caption}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: '#737373', padding: '32px 0', fontSize: 13 }}>スタイル写真はまだありません</div>
                )}

                {/* スタイリスト別作品集 */}
                {stylists.length > 0 && stylistPhotos.length > 0 && (
                  <div>
                    <div style={sectionTitle}>スタイリスト別作品集</div>
                    {stylists.map(s => {
                      const photos = stylistPhotos.filter(p => p.stylist_id === s.id)
                      if (photos.length === 0) return null
                      return (
                        <div key={s.id} style={{ marginBottom: 24 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#FBE0EC,#EED9F7)', overflow: 'hidden', flexShrink: 0 }}>
                              {s.image_url
                                ? <img src={s.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, ...gradText }}>{s.name?.[0]}</div>}
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{s.name}</div>
                              {s.role && <div style={{ fontSize: 11, ...gradText }}>{s.role}</div>}
                            </div>
                          </div>
                          <div className="sp-photo-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                            {photos.map(photo => (
                              <img key={photo.id} src={photo.image_url} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8 }} />
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── スタイリストタブ ── */}
            {infoTab === 'stylists' && (
              <div>
                {stylists.length === 0
                  ? <div style={{ textAlign: 'center', color: '#737373', padding: '32px 0', fontSize: 13 }}>スタイリスト情報はまだありません</div>
                  : stylists.map(s => (
                    <div key={s.id} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: '1px solid #DBDBDB' }}>
                      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#FBE0EC,#EED9F7)', overflow: 'hidden', flexShrink: 0 }}>
                        {s.image_url
                          ? <img src={s.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, ...gradText }}>{s.name?.[0]}</div>}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>{s.name}</div>
                        {s.role && <div style={{ fontSize: 11, fontWeight: 700, ...gradText, marginTop: 2 }}>{s.role}</div>}
                        {s.experience_years && <div style={{ fontSize: 11, color: '#737373' }}>経験{s.experience_years}年</div>}
                        {s.instagram && <a href={`https://instagram.com/${s.instagram}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#5851DB', textDecoration: 'none' }}>@{s.instagram}</a>}
                        {s.description && <p style={{ fontSize: 12, color: '#555', marginTop: 4, lineHeight: 1.7 }}>{s.description}</p>}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* ── 予約タブ ── */}
            {infoTab === 'booking' && (
              <div>
                {/* ブロック警告 */}
                {isBlocked && (
                  <div style={{ background: '#FFEBEE', border: '1.5px solid #FFCDD2', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#C62828', fontWeight: 700 }}>
                    このサロンへの予約はご利用いただけません。
                  </div>
                )}
                {/* ログイン案内 */}
                {!user && (
                  <div style={{ background: '#FFFDE7', border: '1px solid #FFF176', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: '#F57F17' }}>予約にはログインが必要です</span>
                    <button onClick={() => router.push(`/auth?redirect=/salons/${id}`)}
                      style={{ background: '#FFA000', color: 'white', border: 'none', padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                      ログイン
                    </button>
                  </div>
                )}

                {/* ステップインジケーター */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
                  {[
                    { n: 1, label: 'メニュー' },
                    { n: 2, label: 'スタイリスト' },
                    { n: 3, label: '日時' },
                    { n: 4, label: '確認' },
                  ].map((s, i) => (
                    <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 700,
                          background: step === s.n ? grad : step > s.n ? '#F0E6F5' : '#F2F2F2',
                          color: step === s.n ? 'white' : step > s.n ? '#833AB4' : '#BDBDBD',
                        }}>{s.n}</div>
                        <span style={{ fontSize: 10, marginTop: 3, color: step === s.n ? '#E1306C' : '#BDBDBD', fontWeight: step === s.n ? 700 : 400 }}>{s.label}</span>
                      </div>
                      {i < 3 && <div style={{ height: 1, flex: 1, marginBottom: 14, background: step > s.n ? '#F0A0C0' : '#E0E0E0' }} />}
                    </div>
                  ))}
                </div>

                {/* STEP 1: メニュー */}
                {step === 1 && (
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 12 }}>メニューを選ぶ</div>
                    {menus.length === 0
                      ? <div style={{ textAlign: 'center', color: '#737373', fontSize: 13, padding: '24px 0' }}>メニューがまだありません</div>
                      : menus.map(menu => {
                          // 初回限定メニューの場合、非初回ユーザーは選択不可
                          const isFirstOnly = !!menu.is_first_visit
                          const canSelect = !isFirstOnly || isFirstVisit !== false
                          const isLocked = isFirstOnly && isFirstVisit === false
                          return (
                            <div key={menu.id}
                              onClick={() => canSelect && setSelectedMenu(menu)}
                              style={{
                                padding: 14,
                                border: selectedMenu?.id === menu.id ? '2px solid #E1306C' : isLocked ? '1.5px solid #EEEEEE' : '1.5px solid #DBDBDB',
                                borderRadius: 10,
                                cursor: canSelect ? 'pointer' : 'not-allowed',
                                marginBottom: 8,
                                background: selectedMenu?.id === menu.id ? '#FFF0F5' : isLocked ? '#F8F8F8' : 'white',
                                opacity: isLocked ? 0.55 : 1,
                                transition: 'all 0.15s',
                                position: 'relative' as any,
                              }}>
                              {/* 初回限定バッジ */}
                              {isFirstOnly && (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: isLocked ? '#E0E0E0' : 'linear-gradient(45deg,#F77737,#E1306C)', color: 'white' }}>
                                    初回限定
                                  </span>
                                  {isLocked && (
                                    <span style={{ fontSize: 10, color: '#BDBDBD' }}>※ 2回目以降のご来店には適用できません</span>
                                  )}
                                  {!isLocked && isFirstVisit && (
                                    <span style={{ fontSize: 10, color: '#E1306C' }}>✓ あなたは初回限定対象です</span>
                                  )}
                                  {!isLocked && isFirstVisit === null && (
                                    <span style={{ fontSize: 10, color: '#737373' }}>ログイン後に確認できます</span>
                                  )}
                                </div>
                              )}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 14, fontWeight: 700, color: isLocked ? '#BDBDBD' : '#111' }}>{menu.name}</div>
                                  {menu.description && <div style={{ fontSize: 11, color: '#737373', marginTop: 3, lineHeight: 1.6 }}>{menu.description}</div>}
                                  <div style={{ fontSize: 11, color: '#737373', marginTop: 3 }}>約{menu.duration}分</div>
                                </div>
                                <div style={{ fontSize: 15, fontWeight: 700, ...(isLocked ? { color: '#BDBDBD' } : gradText), marginLeft: 12, flexShrink: 0 }}>¥{menu.price.toLocaleString()}</div>
                              </div>
                            </div>
                          )
                        })}
                    <button onClick={() => selectedMenu && setStep(2)} disabled={!selectedMenu}
                      style={{ width: '100%', marginTop: 8, background: selectedMenu ? grad : '#E0E0E0', color: 'white', border: 'none', padding: 13, borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: selectedMenu ? 'pointer' : 'not-allowed', fontFamily: 'inherit', opacity: selectedMenu ? 1 : 0.5 }}>
                      次へ（スタイリストを選ぶ）→
                    </button>
                  </div>
                )}

                {/* STEP 2: スタイリスト */}
                {step === 2 && (
                  <div>
                    <button onClick={() => setStep(1)} style={{ fontSize: 12, color: '#737373', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 12, fontFamily: 'inherit' }}>← 戻る</button>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 4 }}>スタイリストを指名</div>
                    <div style={{ fontSize: 11, color: '#737373', marginBottom: 12 }}>選択メニュー：{selectedMenu?.name}（約{selectedMenu?.duration}分）</div>

                    <div onClick={() => handleStylistSelect(null)}
                      style={{ padding: 14, border: '1.5px dashed #F0A0C0', borderRadius: 10, cursor: 'pointer', marginBottom: 10, background: '#FFF0F5', display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.15s' }}>
                      <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'white', border: '1.5px solid #F0A0C0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>👤</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>指名なし（フリー枠）</div>
                        <div style={{ fontSize: 11, color: '#737373', marginTop: 2 }}>サロンにお任せします</div>
                        <div style={{ fontSize: 11, color: '#E1306C', marginTop: 2 }}>空き枠が最も多く取りやすいです</div>
                      </div>
                    </div>

                    {stylists.length > 0 && (
                      <>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#737373', marginBottom: 8 }}>スタイリストを指名する</div>
                        {stylists.map(s => (
                          <div key={s.id} onClick={() => handleStylistSelect(s)}
                            style={{ padding: 14, border: '1.5px solid #DBDBDB', borderRadius: 10, cursor: 'pointer', marginBottom: 8, background: 'white', display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.15s' }}>
                            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#FBE0EC,#EED9F7)', overflow: 'hidden', flexShrink: 0 }}>
                              {s.image_url
                                ? <img src={s.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, ...gradText }}>{s.name?.[0]}</div>}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>{s.name}</div>
                              {s.role && <div style={{ fontSize: 11, fontWeight: 700, ...gradText }}>{s.role}</div>}
                              {s.experience_years && <div style={{ fontSize: 11, color: '#737373' }}>経験{s.experience_years}年</div>}
                              {s.description && <div style={{ fontSize: 11, color: '#737373', marginTop: 3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as any}>{s.description}</div>}
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}

                {/* STEP 3: 日時 */}
                {step === 3 && (
                  <div>
                    <button onClick={() => setStep(2)} style={{ fontSize: 12, color: '#737373', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 12, fontFamily: 'inherit' }}>← 戻る</button>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 4 }}>日時を選ぶ</div>
                    <div style={{ fontSize: 11, color: '#737373', marginBottom: 2 }}>{selectedMenu?.name}　／　担当：{selectedStylist?.name || '指名なし（フリー枠）'}</div>
                    <div style={{ fontSize: 11, color: '#F57F17', marginBottom: 12 }}>予約は12時間前まで受け付けています</div>

                    {availabilityLoading ? (
                      <div style={{ textAlign: 'center', padding: '40px 0', color: '#737373', fontSize: 13 }}>空き枠を確認中...</div>
                    ) : (
                      <>
                        {/* 直近の空き案内 */}
                        {nearestAvailableDate && !selectedDate && (
                          <div style={{ background: '#E8F5E9', border: '1px solid #A5D6A7', borderRadius: 10, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 12, color: '#2E7D32' }}>直近の空き：<strong>{nearestAvailableDate.replace(/-/g, '/')}</strong></span>
                            <button onClick={() => setSelectedDate(nearestAvailableDate)}
                              style={{ background: '#43A047', color: 'white', border: 'none', padding: '4px 12px', borderRadius: 100, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                              この日を選ぶ
                            </button>
                          </div>
                        )}

                        {/* カレンダー */}
                        <div style={{ background: '#FAFAFA', borderRadius: 10, border: '1px solid #DBDBDB', padding: 14, marginBottom: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                              style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid #DBDBDB', background: 'white', cursor: 'pointer', fontSize: 12, color: '#737373', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>◀</button>
                            <span style={{ fontWeight: 700, fontSize: 14, color: '#111' }}>{currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月</span>
                            <button
                              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                              disabled={currentMonth >= maxMonth}
                              style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid #DBDBDB', background: 'white', cursor: currentMonth >= maxMonth ? 'not-allowed' : 'pointer', fontSize: 12, color: currentMonth >= maxMonth ? '#BDBDBD' : '#737373', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', opacity: currentMonth >= maxMonth ? 0.4 : 1 }}>▶</button>
                          </div>

                          <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                            <span style={{ fontSize: 10, color: '#737373', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: 3, background: '#E8F5E9', border: '1px solid #A5D6A7' }} />○ 空きあり
                            </span>
                            <span style={{ fontSize: 10, color: '#737373', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: 3, background: '#F5F5F5' }} />× 受付不可
                            </span>
                          </div>

                          <div className="sp-calendar-header" style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4 }}>
                            {DAY_NAMES.map((d, i) => (
                              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, padding: '4px 0', color: i === 0 ? '#E53935' : i === 6 ? '#5851DB' : '#737373' }}>{d}</div>
                            ))}
                          </div>

                          <div className="sp-calendar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
                            {calendarDays.map((day, i) => (
                              <div key={i} style={{ aspectRatio: '1' }}>
                                {day.isEmpty ? <div /> : day.isPast ? (
                                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#BDBDBD' }}>
                                    {parseInt(day.date.split('-')[2])}
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => { if (day.available) { setSelectedDate(day.date); setSelectedTime('') } }}
                                    disabled={!day.available}
                                    style={{
                                      width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                      borderRadius: 6, fontSize: 11, fontWeight: 700, border: 'none', cursor: day.available ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
                                      background: selectedDate === day.date ? grad : day.available ? '#E8F5E9' : 'transparent',
                                      color: selectedDate === day.date ? 'white' : day.available ? '#2E7D32' : '#BDBDBD',
                                      outline: selectedDate === day.date ? 'none' : day.available ? '1px solid #A5D6A7' : 'none',
                                    }}>
                                    <span>{parseInt(day.date.split('-')[2])}</span>
                                    <span style={{ fontSize: 9 }}>{day.available ? '○' : '×'}</span>
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 時間スロット */}
                        {selectedDate && (
                          <div style={{ background: '#FAFAFA', borderRadius: 10, border: '1px solid #DBDBDB', padding: 14, marginBottom: 12 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 10 }}>
                              {selectedDate.replace(/-/g, '/')} の空き時間
                            </div>
                            {allTimeSlots.length === 0
                              ? <div style={{ fontSize: 12, color: '#737373' }}>この日は受付可能な時間帯がありません</div>
                              : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                                  {allTimeSlots.map(slot => {
                                    const available = timeSlots.includes(slot)
                                    const isSelected = selectedTime === slot
                                    return (
                                      <button key={slot}
                                        onClick={() => available && setSelectedTime(slot)}
                                        disabled={!available}
                                        style={{
                                          padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                                          border: 'none', cursor: available ? 'pointer' : 'not-allowed',
                                          background: isSelected ? grad : available ? '#E8F5E9' : '#F5F5F5',
                                          color: isSelected ? 'white' : available ? '#2E7D32' : '#BDBDBD',
                                          outline: available && !isSelected ? '1px solid #A5D6A7' : 'none',
                                        }}>
                                        {slot}
                                      </button>
                                    )
                                  })}
                                </div>
                              )}
                          </div>
                        )}

                        <button onClick={() => selectedDate && selectedTime && setStep(4)}
                          disabled={!selectedDate || !selectedTime}
                          style={{ width: '100%', background: selectedDate && selectedTime ? grad : '#E0E0E0', color: 'white', border: 'none', padding: 13, borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: selectedDate && selectedTime ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                          次へ（予約内容を確認）→
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* STEP 4: 確認 */}
                {step === 4 && (
                  <div>
                    <button onClick={() => setStep(3)} style={{ fontSize: 12, color: '#737373', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 12, fontFamily: 'inherit' }}>← 戻る</button>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 16 }}>予約内容の確認</div>
                    <div style={{ background: '#FAFAFA', border: '1px solid #DBDBDB', borderRadius: 10, padding: 14, marginBottom: 12 }}>
                      {[
                        { label: 'サロン', value: salon.name },
                        { label: 'メニュー', value: selectedMenu?.name },
                        { label: '所要時間', value: `約${selectedMenu?.duration}分` },
                        { label: '担当', value: selectedStylist?.name || '指名なし（フリー枠）' },
                        { label: '日時', value: `${selectedDate.replace(/-/g, '/')} ${selectedTime}` },
                      ].map(row => (
                        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #EEEEEE' }}>
                          <span style={{ fontSize: 12, color: '#737373' }}>{row.label}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>{row.value}</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0' }}>
                        <span style={{ fontSize: 12, color: '#737373' }}>料金</span>
                        <span style={{ fontSize: 18, fontWeight: 700, ...gradText }}>¥{selectedMenu?.price.toLocaleString()}</span>
                      </div>
                    </div>
                    {/* リクエスト写真アップロード */}
                    <div style={{ background: 'white', border: '1px solid #DBDBDB', borderRadius: 10, padding: 14, marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#262626', marginBottom: 4 }}>ご希望スタイルの写真（任意）</div>
                      <div style={{ fontSize: 11, color: '#737373', lineHeight: 1.7, marginBottom: 10 }}>
                        参考にしたいヘアスタイルや仕上がりイメージの写真を添付できます。<br />
                        <span style={{ color: '#E1306C', fontWeight: 700 }}>※ ご希望に必ずしもお応えできるとは限りません。</span>
                      </div>
                      {requestImagePreview ? (
                        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 8 }}>
                          <img src={requestImagePreview} alt="プレビュー" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 10, display: 'block', border: '1.5px solid #DBDBDB' }} />
                          <button onClick={() => { setRequestImageFile(null); setRequestImagePreview('') }}
                            style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', width: 22, height: 22, borderRadius: '50%', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>×</button>
                        </div>
                      ) : (
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, border: '1.5px dashed #DBDBDB', background: '#FAFAFA', color: '#737373', padding: '8px 16px', borderRadius: 10, cursor: 'pointer' }}>
                          📷 写真を選ぶ
                          <input type="file" accept="image/*" style={{ display: 'none' }}
                            onChange={e => {
                              const f = e.target.files?.[0]
                              if (f) { setRequestImageFile(f); setRequestImagePreview(URL.createObjectURL(f)) }
                            }} />
                        </label>
                      )}
                    </div>

                    <div style={{ background: '#FFFDE7', border: '1px solid #FFF176', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
                      <div style={{ fontSize: 11, color: '#F57F17', lineHeight: 1.7 }}>サロンの承認後に予約確定となります。3日以内に承認がない場合は自動キャンセルになります。</div>
                      <div style={{ fontSize: 11, color: '#F57F17', lineHeight: 1.7, marginTop: 4 }}>予約状況はマイページでご確認いただけます。</div>
                    </div>
                    <button onClick={makeReservation} disabled={bookingLoading || !user}
                      style={{ width: '100%', background: grad, color: 'white', border: 'none', padding: 15, borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: bookingLoading || !user ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: bookingLoading || !user ? 0.5 : 1 }}>
                      {bookingLoading ? '処理中...' : user ? '予約を申請する' : 'ログインが必要です'}
                    </button>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>

        {/* ════ 右カラム ════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* ユーザー情報カード */}
          <div style={card}>
            {user ? (
              <>
                <div style={{ fontSize: 11, color: '#737373', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #DBDBDB' }}>
                  こんにちは、<strong style={{ color: '#111' }}>{displayName}</strong>さん
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#FBE0EC,#EED9F7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, fontWeight: 700, ...gradText }}>
                    {displayName?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{displayName}</div>
                    <div style={{ fontSize: 11, color: '#737373' }}>一般ユーザー</div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: '#737373', marginBottom: 12, textAlign: 'center' }}>ログインしていません</div>
            )}

            <button
              onClick={() => { setInfoTab('booking'); setStep(1) }}
              style={{ width: '100%', background: grad, color: 'white', border: 'none', padding: '10px 0', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 8 }}>
              空席確認・予約する
            </button>

            {!user && (
              <button onClick={() => router.push(`/auth?redirect=/salons/${id}`)}
                style={{ width: '100%', background: 'none', border: '1px solid #DBDBDB', padding: '8px 0', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', color: '#737373' }}>
                ログイン / 新規登録
              </button>
            )}
          </div>

          {/* マイメニューカード */}
          {user && (
            <div style={card}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#737373', letterSpacing: '0.06em', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #DBDBDB' }}>マイメニュー</div>
              {rightLinks.map(link => (
                <Link key={link.label} href={link.href}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#262626', textDecoration: 'none', padding: '8px 0', borderBottom: '1px solid #F2F2F2' }}>
                  <span style={{ fontSize: 10, color: '#E1306C' }}>▶</span>{link.label}
                </Link>
              ))}
              <button
                onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
                style={{ width: '100%', marginTop: 8, background: 'none', border: '1px solid #DBDBDB', padding: '7px 0', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', color: '#737373' }}>
                ログアウト
              </button>
            </div>
          )}

          {/* 最近見たサロンカード */}
          {recentSalons.filter(s => s.id !== id).length > 0 && (
            <div style={card}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#737373', letterSpacing: '0.06em', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #DBDBDB' }}>最近見たサロン</div>
              {recentSalons
                .filter(s => s.id !== id)
                .map(s => (
                  <Link key={s.id} href={`/salons/${s.id}`}
                    style={{ display: 'block', padding: '7px 0', borderBottom: '1px solid #F2F2F2', textDecoration: 'none' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#262626' }}>{s.name}</div>
                    {s.area && <div style={{ fontSize: 10, color: '#737373', marginTop: 1 }}>{s.area}</div>}
                  </Link>
                ))}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}