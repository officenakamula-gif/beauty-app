import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
    // Vercel Cron の認証チェック
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date().toISOString()

    // confirmed状態の予約をメニューのdurationつきで取得
    const { data: reservations, error: fetchError } = await supabase
        .from('reservations')
        .select('id, reserved_at, menus(duration)')
        .eq('status', 'confirmed')

    if (fetchError) {
        console.error('fetch error:', fetchError)
        return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!reservations || reservations.length === 0) {
        return NextResponse.json({ message: 'No confirmed reservations', updated: 0 })
    }

    // 予約終了時刻（reserved_at + duration分）が現在時刻を過ぎているものを抽出
    const completedIds = reservations
        .filter((r: any) => {
            const duration = r.menus?.duration ?? 60 // durationが不明なら60分をデフォルト
            const endTime = new Date(r.reserved_at).getTime() + duration * 60 * 1000
            return endTime < new Date(now).getTime()
        })
        .map((r: any) => r.id)

    if (completedIds.length === 0) {
        return NextResponse.json({ message: 'No reservations to complete', updated: 0 })
    }

    // 一括でcompletedに更新
    const { error: updateError } = await supabase
        .from('reservations')
        .update({
            status: 'completed',
            completed_at: now,
        })
        .in('id', completedIds)

    if (updateError) {
        console.error('update error:', updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    console.log(`[cron/complete] ${completedIds.length}件をcompletedに更新`)
    return NextResponse.json({ message: 'OK', updated: completedIds.length })
}