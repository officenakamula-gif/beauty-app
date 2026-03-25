import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── ① pending → expired（既存処理） ──────────────────────────
  const { data: expiredData, error: expireError } = await supabase
    .from('reservations')
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .lt('timeout_at', new Date().toISOString())
    .select()

  if (expireError) {
    return NextResponse.json({ error: expireError.message }, { status: 500 })
  }

  // ── ② confirmed → completed（予約日時から12時間以上経過） ──────
  // 決済導入後はここで入金処理を差し込む（is_paid_out = false のまま残す）
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()

  const { data: completedData, error: completeError } = await supabase
    .from('reservations')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      // is_paid_out は false のまま（決済導入後に振込処理で true にする）
    })
    .eq('status', 'confirmed')
    .lt('reserved_at', twelveHoursAgo)
    .select()

  if (completeError) {
    return NextResponse.json({ error: completeError.message }, { status: 500 })
  }

  return NextResponse.json({
    expired: expiredData?.length || 0,
    completed: completedData?.length || 0,
  })
}