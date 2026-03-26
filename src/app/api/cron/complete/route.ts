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

    // 予約終了時刻（reserved_at + duration分 + 1時間バッファ）が現在時刻を過ぎているものを抽出
    const BUFFER_MS = 60 * 60 * 1000 // 1時間バッファ（施術延長・写真確認の余裕）
    const completedIds = reservations
        .filter((r: any) => {
            const duration = r.menus?.duration ?? 60 // durationが不明なら60分をデフォルト
            const endTime = new Date(r.reserved_at).getTime() + duration * 60 * 1000 + BUFFER_MS
            return endTime < new Date(now).getTime()
        })
        .map((r: any) => r.id)

    if (completedIds.length === 0) {
        return NextResponse.json({ message: 'No reservations to complete', updated: 0 })
    }

    // 削除対象の写真URLを先に取得
    const { data: withImages } = await supabase
        .from('reservations')
        .select('id, request_image_url')
        .in('id', completedIds)
        .not('request_image_url', 'is', null)

    // 一括でcompletedに更新（写真URLもnullにする）
    const { error: updateError } = await supabase
        .from('reservations')
        .update({
            status: 'completed',
            completed_at: now,
            request_image_url: null,
        })
        .in('id', completedIds)

    if (updateError) {
        console.error('update error:', updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Storageから写真を削除
    if (withImages && withImages.length > 0) {
        const filePaths = withImages
            .map((r: any) => {
                try {
                    const url = new URL(r.request_image_url)
                    // publicUrl形式: /storage/v1/object/public/salon-images/reservation-requests/...
                    const match = url.pathname.match(/\/salon-images\/(.+)$/)
                    return match ? match[1] : null
                } catch { return null }
            })
            .filter(Boolean) as string[]

        if (filePaths.length > 0) {
            const { error: storageError } = await supabase.storage
                .from('salon-images')
                .remove(filePaths)
            if (storageError) {
                console.error('storage delete error:', storageError)
            } else {
                console.log(`[cron/complete] ${filePaths.length}件のリクエスト写真を削除`)
            }
        }
    }

    console.log(`[cron/complete] ${completedIds.length}件をcompletedに更新`)
    return NextResponse.json({ message: 'OK', updated: completedIds.length })
}