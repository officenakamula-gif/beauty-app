import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-01-28.clover' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  const body = await request.text()
  const headersList = await headers()
  const sig = headersList.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error('Webhook signature error:', err.message)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  switch (event.type) {
    case 'payment_intent.amount_capturable_updated': {
      // オーソリ完了（仮押さえ成功）
      const pi = event.data.object as Stripe.PaymentIntent
      const reservationId = pi.metadata?.reservation_id
      if (reservationId) {
        await supabase
          .from('reservations')
          .update({ payment_status: 'authorized' })
          .eq('id', reservationId)
      }
      break
    }
    case 'payment_intent.succeeded': {
      // キャプチャ完了（引き落とし確定）
      const pi = event.data.object as Stripe.PaymentIntent
      const reservationId = pi.metadata?.reservation_id
      if (reservationId) {
        await supabase
          .from('reservations')
          .update({ payment_status: 'captured' })
          .eq('id', reservationId)
      }
      break
    }
    case 'payment_intent.canceled': {
      // キャンセル・オーソリ解除
      const pi = event.data.object as Stripe.PaymentIntent
      const reservationId = pi.metadata?.reservation_id
      if (reservationId) {
        await supabase
          .from('reservations')
          .update({ payment_status: 'released' })
          .eq('id', reservationId)
      }
      break
    }
    default:
      break
  }

  return NextResponse.json({ received: true })
}
