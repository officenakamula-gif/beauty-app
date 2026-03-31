import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state') // salon_id を渡す
    const error = url.searchParams.get('error')

    if (error || !code || !state) {
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?calendar=error`
        )
    }

    try {
        // コードをトークンに交換
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET!,
                redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
                grant_type: 'authorization_code',
            }),
        })

        const tokenData = await tokenRes.json()
        if (!tokenData.access_token) {
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?calendar=error`
            )
        }

        const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

        // トークンをDBに保存（upsert）
        await supabase.from('google_calendar_tokens').upsert({
            salon_id: state,
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token || null,
            expires_at: expiresAt,
        }, { onConflict: 'salon_id' })

        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?calendar=success`
        )
    } catch (err) {
        console.error('Google OAuth callback error:', err)
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?calendar=error`
        )
    }
}