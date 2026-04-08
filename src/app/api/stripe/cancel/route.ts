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
      return NextResponse.json({ skipped: true })
    }

    if (['released', 'refunded'].includes(reservation.payment_status)) {
      return NextResponse.json({ skipped: true })
    }

    await stripe.paymentIntents.cancel(reservation.stripe_payment_intent_id)

    await supabase
      .from('reservations')
      .update({ payment_status: 'released' })
      .eq('id', reservationId)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('cancel payment error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
