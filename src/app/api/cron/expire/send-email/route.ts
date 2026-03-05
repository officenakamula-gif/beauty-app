import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { to, subject, html } = await request.json()

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'BeautyBook <onboarding@resend.dev>',
      to,
      subject,
      html,
    }),
  })

  if (!res.ok) {
    const error = await res.json()
    return NextResponse.json({ error }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}