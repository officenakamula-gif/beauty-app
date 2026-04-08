import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-12-18.acacia' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { reservationId, amount, salonName, menuName } = await request.json()

    if (!reservationId || !amount || amount <= 0) {
      return NextResponse.json({ error: 'パラメータが不正です' }, { status: 400 })
    }

    const { data: reservation, error: resError } = await supabase
      .from('reservations')
      .select('id, payment_status')
      .eq('id', reservationId)
      .single()

    if (resError || !reservation) {
      return NextResponse.json({ error: '予約が見つかりません' }, { status: 404 })
    }

    if (reservation.payment_status !== 'unpaid') {
      return NextResponse.json({ error: 'すでに決済処理済みです' }, { status: 400 })
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency: 'jpy',
      capture_method: 'manual',
      metadata: {
        reservation_id: reservationId,
        salon_name: salonName,
        menu_name: menuName,
      },
      description: `${salonName} - ${menuName}`,
    })

    await supabase
      .from('reservations')
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        payment_status: 'authorized',
      })
      .eq('id', reservationId)

    return NextResponse.json({ clientSecret: paymentIntent.client_secret })
  } catch (err: any) {
    console.error('create-payment-intent error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
