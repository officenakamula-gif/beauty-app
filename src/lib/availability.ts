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
export const isSlotBookable = (dateStr: string, slotTime: string, deadlineHours: number = 24): boolean => {
  const slotDate = new Date(`${dateStr}T${slotTime}:00+09:00`)
  const now = new Date()
  const diffHours = (slotDate.getTime() - now.getTime()) / (1000 * 60 * 60)
  return diffHours >= deadlineHours
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
    if (!isSlotBookable(date, slot, 24)) return false  // ③対応（V1はデフォルト24時間）
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
    return isSlotBookable(date, slot, 24)  // ③対応（V1はデフォルト24時間）
  })
}
// ─── サロン例外日・スタッフブロックを考慮したスロット計算 ──────────────────

export type SalonException = {
  date: string       // YYYY-MM-DD
  type: 'closed' | 'open'
  open_start?: string
  open_end?: string
}

export type StylistBlock = {
  date: string       // YYYY-MM-DD
  is_all_day: boolean
  block_start?: string  // HH:MM
  block_end?: string    // HH:MM
}

// サロン例外日チェック
export const getSalonExceptionForDate = (date: string, exceptions: SalonException[]): SalonException | null => {
  return exceptions.find(e => e.date === date) || null
}

// スタイリストブロックでそのスロットが塞がれているか
export const isBlockedByStylstBlock = (
  slotTime: string,
  duration: number,
  blocks: StylistBlock[],
  date: string
): boolean => {
  const dateBlocks = blocks.filter(b => b.date === date)
  if (dateBlocks.length === 0) return false
  const [sh, sm] = slotTime.split(':').map(Number)
  const slotStart = sh * 60 + sm
  const slotEnd = slotStart + duration
  for (const block of dateBlocks) {
    if (block.is_all_day) return true
    if (block.block_start && block.block_end) {
      const [bsh, bsm] = block.block_start.split(':').map(Number)
      const [beh, bem] = block.block_end.split(':').map(Number)
      const blockStart = bsh * 60 + bsm
      const blockEnd = beh * 60 + bem
      // スロットとブロックが重なっていれば不可
      if (slotStart < blockEnd && slotEnd > blockStart) return true
    }
  }
  return false
}

// サロン営業時間・例外日・スタッフブロックをすべて考慮した空きスロット取得
export const getAvailableSlotsV2 = (
  date: string,
  schedule: { start_time: string; end_time: string; is_day_off: boolean } | null,
  duration: number,
  allReservations: any[],
  intervalMin: number,
  salonBusinessHours: { start: string; end: string } | null,
  salonExceptions: SalonException[],
  stylistBlocks: StylistBlock[],
  regularHolidays: string[],
  deadlineHours: number = 24                                  // 予約受付締切時間
): string[] => {
  const DAY_JP = ['日', '月', '火', '水', '木', '金', '土']
  const dow = new Date(date + 'T12:00:00+09:00').getDay()
  const dowName = DAY_JP[dow]

  // サロン例外日を確認
  const exception = getSalonExceptionForDate(date, salonExceptions)

  if (exception?.type === 'closed') return [] // 臨時休業

  // 定休日チェック（例外open指定があれば無視）
  if (!exception && regularHolidays.includes(dowName)) return []

  // スタッフスケジュール（曜日単位）
  const sch = schedule ?? DEFAULT_SCHEDULE
  if (sch.is_day_off && !exception) return []

  // 実際の営業時間を決定（優先順：例外open > スタッフ出勤時間 > サロン営業時間）
  let effectiveStart = sch.start_time
  let effectiveEnd = sch.end_time
  if (exception?.type === 'open' && exception.open_start && exception.open_end) {
    effectiveStart = exception.open_start
    effectiveEnd = exception.open_end
  }
  // サロン営業時間が上限（スタッフの時間がサロン営業時間を超えないよう制限）
  if (salonBusinessHours) {
    const [ssh, ssm] = salonBusinessHours.start.split(':').map(Number)
    const [seh, sem] = salonBusinessHours.end.split(':').map(Number)
    const [esh, esm] = effectiveStart.split(':').map(Number)
    const [eeh, eem] = effectiveEnd.split(':').map(Number)
    if (esh * 60 + esm < ssh * 60 + ssm) effectiveStart = salonBusinessHours.start
    if (eeh * 60 + eem > seh * 60 + sem) effectiveEnd = salonBusinessHours.end
  }

  const dayRes = allReservations.filter(r =>
    !['cancelled', 'expired'].includes(r.status) && toJSTDateStr(r.reserved_at) === date
  )
  const [eh, em] = effectiveEnd.split(':').map(Number)
  const workEnd = eh * 60 + em

  return generateSlots(effectiveStart, effectiveEnd, intervalMin).filter(slot => {
    const [sh, sm] = slot.split(':').map(Number)
    if (sh * 60 + sm + duration > workEnd) return false
    if (!isSlotBookable(date, slot, deadlineHours)) return false
    if (isBlockedByStylstBlock(slot, duration, stylistBlocks, date)) return false
    return isSlotAvailable(slot, duration, dayRes)
  })
}

// 全スロット（グレーアウト表示用）V2
export const getAllSlotsV2 = (
  date: string,
  schedule: { start_time: string; end_time: string; is_day_off: boolean } | null,
  duration: number,
  intervalMin: number,
  salonBusinessHours: { start: string; end: string } | null,
  salonExceptions: SalonException[],
  stylistBlocks: StylistBlock[],
  regularHolidays: string[],
  deadlineHours: number = 24
): string[] => {
  const DAY_JP = ['日', '月', '火', '水', '木', '金', '土']
  const dow = new Date(date + 'T12:00:00+09:00').getDay()
  const dowName = DAY_JP[dow]
  const exception = getSalonExceptionForDate(date, salonExceptions)
  if (exception?.type === 'closed') return []
  if (!exception && regularHolidays.includes(dowName)) return []
  const sch = schedule ?? DEFAULT_SCHEDULE
  if (sch.is_day_off && !exception) return []

  let effectiveStart = sch.start_time
  let effectiveEnd = sch.end_time
  if (exception?.type === 'open' && exception.open_start && exception.open_end) {
    effectiveStart = exception.open_start
    effectiveEnd = exception.open_end
  }
  if (salonBusinessHours) {
    const [ssh, ssm] = salonBusinessHours.start.split(':').map(Number)
    const [seh, sem] = salonBusinessHours.end.split(':').map(Number)
    const [esh, esm] = effectiveStart.split(':').map(Number)
    const [eeh, eem] = effectiveEnd.split(':').map(Number)
    if (esh * 60 + esm < ssh * 60 + ssm) effectiveStart = salonBusinessHours.start
    if (eeh * 60 + eem > seh * 60 + sem) effectiveEnd = salonBusinessHours.end
  }

  const [eh, em] = effectiveEnd.split(':').map(Number)
  const workEnd = eh * 60 + em
  return generateSlots(effectiveStart, effectiveEnd, intervalMin).filter(slot => {
    const [sh, sm] = slot.split(':').map(Number)
    if (sh * 60 + sm + duration > workEnd) return false
    if (!isSlotBookable(date, slot, deadlineHours)) return false
    if (isBlockedByStylstBlock(slot, duration, stylistBlocks, date)) return false
    return true
  })
}