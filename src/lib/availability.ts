export const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']

export const generateSlots = (startTime: string, endTime: string, intervalMin: number): string[] => {
  const slots: string[] = []
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  let cur = sh * 60 + sm
  const end = eh * 60 + em
  while (cur < end) {
    slots.push(`${Math.floor(cur / 60).toString().padStart(2, '0')}:${(cur % 60).toString().padStart(2, '0')}`)
    cur += intervalMin
  }
  return slots
}

export const toJSTDateStr = (dateStr: string): string => {
  const d = new Date(dateStr)
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  return jst.toISOString().split('T')[0]
}

export const toJSTHM = (dateStr: string): { h: number; m: number } => {
  const d = new Date(dateStr)
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  return { h: jst.getUTCHours(), m: jst.getUTCMinutes() }
}

// スケジュール未設定の場合のデフォルト（全日10:00-19:00営業）
const DEFAULT_SCHEDULE = { start_time: '10:00', end_time: '19:00', is_day_off: false }

export const isSlotAvailable = (slotTime: string, duration: number, dayReservations: any[]): boolean => {
  const [sh, sm] = slotTime.split(':').map(Number)
  const slotStart = sh * 60 + sm
  const slotEnd = slotStart + duration
  for (const res of dayReservations) {
    // cancelled/expiredは除外、pending/confirmedは埋まり扱い（⑦対応）
    if (['cancelled', 'expired'].includes(res.status)) continue
    const { h, m } = toJSTHM(res.reserved_at)
    const resStart = h * 60 + m
    const resDuration = res.menus?.duration || 60
    const resEnd = resStart + resDuration
    if (slotStart < resEnd && slotEnd > resStart) return false
  }
  return true
}

// 12時間以内のスロットを除外（③対応）
export const isSlotBookable = (dateStr: string, slotTime: string): boolean => {
  const [sh, sm] = slotTime.split(':').map(Number)
  const slotDate = new Date(`${dateStr}T${slotTime}:00+09:00`)
  const now = new Date()
  const diffHours = (slotDate.getTime() - now.getTime()) / (1000 * 60 * 60)
  return diffHours >= 12
}

export const getAvailableSlots = (
  date: string,
  schedule: { start_time: string; end_time: string; is_day_off: boolean } | null,
  duration: number,
  allReservations: any[],
  intervalMin: number
): string[] => {
  // ①対応：スケジュール未設定はデフォルトを使用
  const sch = schedule ?? DEFAULT_SCHEDULE
  if (sch.is_day_off) return []

  const dayRes = allReservations.filter(r =>
    !['cancelled', 'expired'].includes(r.status) && toJSTDateStr(r.reserved_at) === date
  )
  const [eh, em] = sch.end_time.split(':').map(Number)
  const workEnd = eh * 60 + em

  return generateSlots(sch.start_time, sch.end_time, intervalMin).filter(slot => {
    const [sh, sm] = slot.split(':').map(Number)
    if (sh * 60 + sm + duration > workEnd) return false
    if (!isSlotBookable(date, slot)) return false  // ③対応：12時間前カット
    return isSlotAvailable(slot, duration, dayRes)
  })
}

// 営業時間内の全スロット（グレーアウト表示用・12時間フィルター込み）
export const getAllSlots = (
  date: string,
  schedule: { start_time: string; end_time: string; is_day_off: boolean } | null,
  duration: number,
  intervalMin: number
): string[] => {
  const sch = schedule ?? DEFAULT_SCHEDULE
  if (sch.is_day_off) return []
  const [eh, em] = sch.end_time.split(':').map(Number)
  const workEnd = eh * 60 + em
  return generateSlots(sch.start_time, sch.end_time, intervalMin).filter(slot => {
    const [sh, sm] = slot.split(':').map(Number)
    if (sh * 60 + sm + duration > workEnd) return false
    return isSlotBookable(date, slot)  // ③対応
  })
}