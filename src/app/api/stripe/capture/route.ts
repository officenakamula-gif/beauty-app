import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-01-28.clover' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// サロンが予約を承認したときに呼ぶ → キャプチャ（引き落とし確定）
export async function POST(request: Request) {
  try {
    const { reservationId } = await request.json()

    const { data: reservation, error } = await supabase
      .from('reservations')
      .select('stripe_payment_intent_id, payment_status')
      .eq('id', reservationId)
      .single()

    if (error || !reservation) {
      return NextResponse.json({ error: '予約が見つかりません' }, { status: 404 })
    }

    if (!reservation.stripe_payment_intent_id) {
      // 事前決済なし（現地払い）の場合はスキップ
      return NextResponse.json({ skipped: true })
    }

    if (reservation.payment_status === 'captured') {
      return NextResponse.json({ skipped: true })
    }

    // キャプチャ実行
    await stripe.paymentIntents.capture(reservation.stripe_payment_intent_id)

    await supabase
      .from('reservations')
      .update({ payment_status: 'captured' })
      .eq('id', reservationId)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('capture error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
