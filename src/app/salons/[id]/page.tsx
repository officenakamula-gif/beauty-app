'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import BlockButton from '@/components/BlockButton'
import { sendEmail, emailTemplates } from '@/lib/email'
import { DAY_NAMES, getAvailableSlots, toJSTDateStr, generateSlots } from '@/lib/availability'

export default function SalonDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()

  const [salon, setSalon] = useState<any>(null)
  const [menus, setMenus] = useState<any[]>([])
  const [stylists, setStylists] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [infoTab, setInfoTab] = useState<'info' | 'booking' | 'stylists'>('info')

  const [step, setStep] = useState(1)
  const [selectedMenu, setSelectedMenu] = useState<any>(null)
  const [selectedStylist, setSelectedStylist] = useState<any>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')

  const [schedules, setSchedules] = useState<any[]>([])
  const [reservations, setReservations] = useState<any[]>([])
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [bookingLoading, setBookingLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    fetchSalonData()
  }, [])

  const fetchSalonData = async () => {
    const { data: salonData } = await supabase.from('salons').select('*').eq('id', id).single()
    setSalon(salonData)
    const { data: menuData } = await supabase.from('menus').select('*').eq('salon_id', id).order('price')
    setMenus(menuData || [])
    const { data: stylistData } = await supabase.from('stylists').select('*').eq('salon_id', id).eq('is_active', true)
    setStylists(stylistData || [])
  }

  const loadAvailability = async (stylistId: string | null) => {
    setAvailabilityLoading(true)
    const now = new Date()
    const future = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)

    if (stylistId) {
      const { data: schData } = await supabase.from('stylist_schedules').select('*').eq('stylist_id', stylistId)
      setSchedules(schData || [])
      const { data: resData } = await supabase.from('reservations')
        .select('*, menus(duration)')
        .eq('stylist_id', stylistId)
        .gte('reserved_at', now.toISOString())
        .lte('reserved_at', future.toISOString())
      setReservations(resData || [])
    } else {
      const stylistIds = stylists.map(s => s.id)
      if (stylistIds.length > 0) {
        const { data: schData } = await supabase.from('stylist_schedules').select('*').in('stylist_id', stylistIds)
        setSchedules(schData || [])
      } else {
        setSchedules([])
      }
      const { data: resData } = await supabase.from('reservations')
        .select('*, menus(duration)')
        .eq('salon_id', id)
        .gte('reserved_at', now.toISOString())
        .lte('reserved_at', future.toISOString())
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
      if (stylists.length === 0) {
        return getAvailableSlots(date, null, duration, reservations, interval).length > 0
      }
      return stylists.some(s => {
        const schedule = getScheduleForDate(date, s.id)
        const stylistRes = reservations.filter(r => r.stylist_id === s.id)
        return getAvailableSlots(date, schedule, duration, stylistRes, interval).length > 0
      })
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
      if (stylists.length === 0) {
        return getAvailableSlots(date, null, duration, reservations, interval)
      }
      const allSlots = new Set<string>()
      stylists.forEach(s => {
        const schedule = getScheduleForDate(date, s.id)
        const stylistRes = reservations.filter(r => r.stylist_id === s.id)
        getAvailableSlots(date, schedule, duration, stylistRes, interval).forEach(slot => allSlots.add(slot))
      })
      return Array.from(allSlots).sort()
    }
  }

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
      const available = !isPast && getDateAvailable(dateStr)
      days.push({ date: dateStr, available, isPast, isEmpty: false })
    }
    return days
  }, [currentMonth, schedules, reservations, selectedMenu, selectedStylist, stylists, salon])

  const timeSlots = useMemo(() => {
    if (!selectedDate || !selectedMenu) return []
    return getDateSlots(selectedDate)
  }, [selectedDate, schedules, reservations, selectedMenu, selectedStylist, stylists, salon])

  const allTimeSlots = useMemo(() => {
    if (!selectedDate || !selectedMenu) return []
    const interval = salon?.slot_interval || 30
    if (selectedStylist) {
      const schedule = getScheduleForDate(selectedDate, selectedStylist.id)
      if (!schedule || schedule.is_day_off) return []
      const [eh, em] = schedule.end_time.split(':').map(Number)
      const workEnd = eh * 60 + em
      const duration = selectedMenu.duration
      return generateSlots(schedule.start_time, schedule.end_time, interval).filter(slot => {
        const [sh, sm] = slot.split(':').map(Number)
        return sh * 60 + sm + duration <= workEnd
      })
    } else {
      if (stylists.length === 0) return generateSlots('10:00', '19:00', interval)
      const allSlots = new Set<string>()
      stylists.forEach(s => {
        const schedule = getScheduleForDate(selectedDate, s.id)
        if (!schedule || schedule.is_day_off) return
        const [eh, em] = schedule.end_time.split(':').map(Number)
        const workEnd = eh * 60 + em
        const duration = selectedMenu.duration
        generateSlots(schedule.start_time, schedule.end_time, interval).forEach(slot => {
          const [sh, sm] = slot.split(':').map(Number)
          if (sh * 60 + sm + duration <= workEnd) allSlots.add(slot)
        })
      })
      return Array.from(allSlots).sort()
    }
  }, [selectedDate, schedules, selectedMenu, selectedStylist, stylists, salon])

  const makeReservation = async () => {
    if (!user) { router.push('/auth'); return }
    setBookingLoading(true)
    const reservedAt = `${selectedDate}T${selectedTime}:00+09:00`
    const { error } = await supabase.from('reservations').insert({
      user_id: user.id,
      salon_id: id,
      menu_id: selectedMenu.id,
      stylist_id: selectedStylist?.id || null,
      reserved_at: reservedAt,
    })
    if (error) {
      alert('予約失敗: ' + error.message)
      setBookingLoading(false)
      return
    }
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
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">読み込み中...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-pink-500 text-white p-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white text-xl">←</button>
        <h1 className="text-lg font-bold flex-1">{salon.name}</h1>
        <BlockButton salonId={id} />
      </header>

      <div className="bg-white p-4 border-b">
        {salon.top_image
          ? <img src={salon.top_image} alt={salon.name} className="w-full h-36 object-cover rounded-lg mb-3" />
          : <div className="bg-pink-100 rounded-lg h-36 flex items-center justify-center text-5xl mb-3">💅</div>}
        <h2 className="text-xl font-bold mb-1">{salon.name}</h2>
        <div className="flex flex-wrap gap-x-4 text-sm text-gray-500">
          <span>📍 {salon.area}　{salon.address}</span>
          {salon.nearest_station && <span>🚃 {salon.nearest_station}駅近</span>}
          {salon.phone && <span>📞 {salon.phone}</span>}
        </div>
      </div>

      <div className="flex bg-white border-b">
        {(['info', 'booking', 'stylists'] as const).map(t => (
          <button key={t} onClick={() => { setInfoTab(t); if (t === 'booking') setStep(1) }}
            className={`flex-1 py-3 text-sm font-bold transition ${infoTab === t ? 'border-b-2 border-pink-500 text-pink-500' : 'text-gray-400'}`}>
            {t === 'info' ? 'サロン情報' : t === 'booking' ? '予約する' : 'スタイリスト'}
          </button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto p-4">

        {/* サロン情報 */}
        {infoTab === 'info' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-bold mb-2">サロンについて</h3>
              <p className="text-sm text-gray-600">{salon.description || '説明文はまだありません'}</p>
            </div>
            {(salon.gallery_images || []).length > 0 && (
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="font-bold mb-3">📷 店内・サロン画像</h3>
                <div className="grid grid-cols-3 gap-2">
                  {salon.gallery_images.map((url: string, i: number) => (
                    <img key={i} src={url} alt="" className="w-full h-24 object-cover rounded-lg" />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* スタイリスト */}
        {infoTab === 'stylists' && (
          <div>
            {stylists.length === 0
              ? <p className="text-center text-gray-400 mt-8">スタイリスト情報はまだありません</p>
              : stylists.map(s => (
                <div key={s.id} className="bg-white rounded-xl shadow p-4 mb-3 flex items-start gap-3">
                  <div className="w-16 h-16 rounded-full bg-pink-100 overflow-hidden flex-shrink-0">
                    {s.image_url
                      ? <img src={s.image_url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-2xl">✂️</div>}
                  </div>
                  <div>
                    <p className="font-bold">{s.name}</p>
                    {s.role && <p className="text-xs text-pink-500 font-bold">{s.role}</p>}
                    {s.experience_years && <p className="text-xs text-gray-500">経験{s.experience_years}年</p>}
                    {s.instagram && <a href={`https://instagram.com/${s.instagram}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400">@{s.instagram}</a>}
                    {s.description && <p className="text-sm text-gray-600 mt-1">{s.description}</p>}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* 予約フロー */}
        {infoTab === 'booking' && (
          <div>
            {/* ステップインジケーター */}
            <div className="flex items-center mb-6">
              {[
                { n: 1, label: 'メニュー' },
                { n: 2, label: 'スタイリスト' },
                { n: 3, label: '日時' },
                { n: 4, label: '確認' },
              ].map((s, i) => (
                <div key={s.n} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      step === s.n ? 'bg-pink-500 text-white' : step > s.n ? 'bg-pink-200 text-pink-700' : 'bg-gray-100 text-gray-400'
                    }`}>{s.n}</div>
                    <span className={`text-xs mt-0.5 ${step === s.n ? 'text-pink-500 font-bold' : 'text-gray-400'}`}>{s.label}</span>
                  </div>
                  {i < 3 && <div className={`h-0.5 flex-1 -mt-5 ${step > s.n ? 'bg-pink-300' : 'bg-gray-200'}`} />}
                </div>
              ))}
            </div>

            {/* STEP 1: メニュー */}
            {step === 1 && (
              <div>
                <h3 className="font-bold text-lg mb-3">📋 メニューを選ぶ</h3>
                {menus.length === 0
                  ? <p className="text-gray-400 text-sm">メニューがまだありません</p>
                  : menus.map(menu => (
                    <div key={menu.id} onClick={() => setSelectedMenu(menu)}
                      className={`p-4 border-2 rounded-xl cursor-pointer mb-2 transition bg-white ${selectedMenu?.id === menu.id ? 'border-pink-500 bg-pink-50' : 'border-gray-100 hover:border-pink-300'}`}>
                      <div className="flex justify-between items-center">
                        <span className="font-bold">{menu.name}</span>
                        <span className="text-pink-600 font-bold text-lg">¥{menu.price.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">⏱ 約{menu.duration}分</p>
                    </div>
                  ))}
                <button onClick={() => selectedMenu && setStep(2)} disabled={!selectedMenu}
                  className="w-full mt-4 bg-pink-500 text-white py-3 rounded-xl font-bold disabled:opacity-40 transition">
                  次へ（スタイリストを選ぶ）→
                </button>
              </div>
            )}

            {/* STEP 2: スタイリスト */}
            {step === 2 && (
              <div>
                <button onClick={() => setStep(1)} className="text-sm text-gray-400 mb-4 block">← 戻る</button>
                <h3 className="font-bold text-lg mb-1">✂️ スタイリストを指名</h3>
                <p className="text-xs text-gray-400 mb-3">選択メニュー：{selectedMenu?.name}（約{selectedMenu?.duration}分）</p>

                <div onClick={() => handleStylistSelect(null)}
                  className="p-4 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer mb-3 hover:border-pink-400 bg-white transition flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-2xl">👤</div>
                  <div>
                    <p className="font-bold">指名なし</p>
                    <p className="text-xs text-gray-400">サロンにお任せします</p>
                  </div>
                </div>

                {stylists.map(s => (
                  <div key={s.id} onClick={() => handleStylistSelect(s)}
                    className="p-4 border-2 border-gray-100 rounded-xl cursor-pointer mb-2 hover:border-pink-400 bg-white transition flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-pink-100 overflow-hidden flex-shrink-0">
                      {s.image_url
                        ? <img src={s.image_url} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-2xl">✂️</div>}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold">{s.name}</p>
                      {s.role && <p className="text-xs text-pink-500">{s.role}</p>}
                      {s.experience_years && <p className="text-xs text-gray-400">経験{s.experience_years}年</p>}
                      {s.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{s.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* STEP 3: 日時 */}
            {step === 3 && (
              <div>
                <button onClick={() => setStep(2)} className="text-sm text-gray-400 mb-4 block">← 戻る</button>
                <h3 className="font-bold text-lg mb-1">📅 日時を選ぶ</h3>
                <p className="text-xs text-gray-400 mb-3">
                  {selectedMenu?.name}　／　担当：{selectedStylist?.name || '指名なし'}
                </p>

                {availabilityLoading ? (
                  <div className="text-center py-12 text-gray-400">空き枠を確認中...</div>
                ) : (
                  <>
                    {/* カレンダー */}
                    <div className="bg-white rounded-xl shadow p-4 mb-4">
                      <div className="flex items-center justify-between mb-4">
                        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500">◀</button>
                        <span className="font-bold text-base">
                          {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
                        </span>
                        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500">▶</button>
                      </div>

                      <div className="grid grid-cols-7 mb-1">
                        {DAY_NAMES.map((d, i) => (
                          <div key={d} className={`text-center text-xs font-bold py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500'}`}>{d}</div>
                        ))}
                      </div>

                      <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((day, i) => (
                          <div key={i} className="aspect-square">
                            {day.isEmpty ? <div /> : day.isPast ? (
                              <div className="w-full h-full flex flex-col items-center justify-center text-gray-200 text-xs">
                                <span>{parseInt(day.date.split('-')[2])}</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => { if (day.available) { setSelectedDate(day.date); setSelectedTime('') } }}
                                disabled={!day.available}
                                className={`w-full h-full flex flex-col items-center justify-center rounded-lg text-xs font-bold transition ${
                                  selectedDate === day.date
                                    ? 'bg-pink-500 text-white shadow'
                                    : day.available
                                      ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                                      : 'text-gray-300 cursor-not-allowed'
                                }`}>
                                <span>{parseInt(day.date.split('-')[2])}</span>
                                <span className="text-xs leading-none">{day.available ? '○' : '×'}</span>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 時間スロット */}
                    {selectedDate && (
                      <div className="bg-white rounded-xl shadow p-4 mb-4">
                        <h3 className="font-bold mb-2">
                          🕐 {selectedDate.replace(/-/g, '/')} の空き時間
                        </h3>

                        {/* 凡例 */}
                        <div className="flex gap-4 mb-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <span className="inline-block w-4 h-4 rounded bg-green-100 border border-green-300"></span>
                            空きあり
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="inline-block w-4 h-4 rounded bg-gray-100 border border-gray-200"></span>
                            予約済み・受付不可
                          </span>
                        </div>

                        {allTimeSlots.length === 0 ? (
                          <p className="text-sm text-gray-400">この日は営業していません</p>
                        ) : (
                          <div className="grid grid-cols-4 gap-2">
                            {allTimeSlots.map(slot => {
                              const available = timeSlots.includes(slot)
                              const isSelected = selectedTime === slot
                              return (
                                <button key={slot}
                                  onClick={() => available && setSelectedTime(slot)}
                                  disabled={!available}
                                  className={`py-2 rounded-lg text-sm font-bold border transition ${
                                    isSelected
                                      ? 'bg-pink-500 text-white border-pink-500'
                                      : available
                                        ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'
                                        : 'border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed'
                                  }`}>
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
                      className="w-full bg-pink-500 text-white py-3 rounded-xl font-bold disabled:opacity-40 transition">
                      次へ（予約内容を確認）→
                    </button>
                  </>
                )}
              </div>
            )}

            {/* STEP 4: 確認 */}
            {step === 4 && (
              <div>
                <button onClick={() => setStep(3)} className="text-sm text-gray-400 mb-4 block">← 戻る</button>
                <h3 className="font-bold text-lg mb-4">📝 予約内容の確認</h3>
                <div className="bg-white rounded-xl shadow p-4 mb-4 divide-y">
                  {[
                    { label: 'サロン', value: salon.name },
                    { label: 'メニュー', value: selectedMenu?.name },
                    { label: '所要時間', value: `約${selectedMenu?.duration}分` },
                    { label: '担当', value: selectedStylist?.name || '指名なし' },
                    { label: '日時', value: `${selectedDate.replace(/-/g, '/')} ${selectedTime}` },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between py-2">
                      <span className="text-sm text-gray-500">{row.label}</span>
                      <span className="text-sm font-bold">{row.value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-3">
                    <span className="text-sm text-gray-500">料金</span>
                    <span className="text-xl font-black text-pink-600">¥{selectedMenu?.price.toLocaleString()}</span>
                  </div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4">
                  <p className="text-xs text-yellow-700">⚠️ サロンの承認後に予約確定となります。3日以内に承認がない場合は自動キャンセルになります。</p>
                </div>
                <button onClick={makeReservation} disabled={bookingLoading}
                  className="w-full bg-pink-500 text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50 transition">
                  {bookingLoading ? '処理中...' : user ? '予約を申請する' : 'ログインして予約する'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}