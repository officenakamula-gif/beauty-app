import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// アクセストークンをリフレッシュ
const refreshAccessToken = async (salonId: string, refreshToken: string): Promise<string | null> => {
    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET!,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        }),
    })
    const data = await res.json()
    if (!data.access_token) return null
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()
    await supabase.from('google_calendar_tokens').update({
        access_token: data.access_token,
        expires_at: expiresAt,
    }).eq('salon_id', salonId)
    return data.access_token
}

// 有効なアクセストークンを取得
const getValidToken = async (salonId: string): Promise<string | null> => {
    const { data: tokenData } = await supabase
        .from('google_calendar_tokens')
        .select('*')
        .eq('salon_id', salonId)
        .single()
    if (!tokenData) return null
    // 期限切れの場合はリフレッシュ
    if (new Date(tokenData.expires_at) < new Date() && tokenData.refresh_token) {
        return await refreshAccessToken(salonId, tokenData.refresh_token)
    }
    return tokenData.access_token
}

// POST: カレンダーイベント追加
export async function POST(request: Request) {
    try {
        const { salon_id, reservation_id, summary, start, end, description, location } = await request.json()
        const token = await getValidToken(salon_id)
        if (!token) return NextResponse.json({ error: 'Not connected' }, { status: 401 })

        const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                summary,
                description,
                location,
                start: { dateTime: start, timeZone: 'Asia/Tokyo' },
                end: { dateTime: end, timeZone: 'Asia/Tokyo' },
            }),
        })

        const eventData = await res.json()
        if (!eventData.id) return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })

        // イベントIDをreservationsに保存
        await supabase.from('reservations')
            .update({ google_calendar_event_id: eventData.id })
            .eq('id', reservation_id)

        return NextResponse.json({ event_id: eventData.id })
    } catch (err) {
        console.error('Calendar POST error:', err)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// DELETE: カレンダーイベント削除
export async function DELETE(request: Request) {
    try {
        const { salon_id, event_id } = await request.json()
        const token = await getValidToken(salon_id)
        if (!token) return NextResponse.json({ error: 'Not connected' }, { status: 401 })

        await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${event_id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('Calendar DELETE error:', err)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}