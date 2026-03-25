export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, html }),
    })
  } catch (err) {
    console.error('メール送信失敗:', err)
  }
}

export const emailTemplates = {
  // ユーザー → 予約申請確認
  reservationPending: (salonName: string, menuName: string, date: string) => ({
    subject: `【Salon de Beauty】${salonName}への予約を受け付けました`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;">
        <div style="background:linear-gradient(45deg,#F77737,#E1306C,#833AB4,#5851DB);padding:20px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:20px;">Salon de Beauty</h1>
        </div>
        <div style="padding:24px;">
          <p>予約を受け付けました。サロンからの承認をお待ちください。</p>
          <div style="background:#fdf2f8;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="margin:4px 0;"><strong>サロン：</strong>${salonName}</p>
            <p style="margin:4px 0;"><strong>メニュー：</strong>${menuName}</p>
            <p style="margin:4px 0;"><strong>希望日時：</strong>${date}</p>
            <p style="margin:4px 0;"><strong>ステータス：</strong>承認待ち</p>
          </div>
          <p style="color:#9ca3af;font-size:12px;">※ 3日以内に承認がない場合は自動的にキャンセルになります。</p>
        </div>
      </div>
    `
  }),

  // ユーザー → 予約承認（確定）
  reservationConfirmed: (salonName: string, menuName: string, date: string) => ({
    subject: `【Salon de Beauty】予約が確定しました！`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;">
        <div style="background:linear-gradient(45deg,#F77737,#E1306C,#833AB4,#5851DB);padding:20px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:20px;">Salon de Beauty</h1>
        </div>
        <div style="padding:24px;">
          <p style="font-size:18px;font-weight:bold;color:#E1306C;">✅ 予約が確定しました！</p>
          <div style="background:#fdf2f8;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="margin:4px 0;"><strong>サロン：</strong>${salonName}</p>
            <p style="margin:4px 0;"><strong>メニュー：</strong>${menuName}</p>
            <p style="margin:4px 0;"><strong>日時：</strong>${date}</p>
          </div>
          <p>ご来店をお待ちしております！</p>
        </div>
      </div>
    `
  }),

  // ユーザー → キャンセル・タイムアウト通知
  reservationCancelled: (salonName: string, menuName: string, date: string, reason: 'cancelled' | 'expired' | 'user_cancelled') => ({
    subject: `【Salon de Beauty】予約が${reason === 'expired' ? 'タイムアウト' : 'キャンセル'}になりました`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;">
        <div style="background:linear-gradient(45deg,#F77737,#E1306C,#833AB4,#5851DB);padding:20px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:20px;">Salon de Beauty</h1>
        </div>
        <div style="padding:24px;">
          <p style="font-size:18px;font-weight:bold;color:#6b7280;">
            ${reason === 'expired' ? '⏱ 予約がタイムアウトになりました' : '❌ 予約がキャンセルになりました'}
          </p>
          <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="margin:4px 0;"><strong>サロン：</strong>${salonName}</p>
            <p style="margin:4px 0;"><strong>メニュー：</strong>${menuName}</p>
            <p style="margin:4px 0;"><strong>日時：</strong>${date}</p>
          </div>
          <p>
            ${reason === 'expired' ? '承認期限を過ぎたため自動的にキャンセルされました。' : reason === 'user_cancelled' ? 'お客様によりキャンセルされました。' : 'サロンによりキャンセルされました。'}
          </p>
          <p>他のサロンや日時で再度ご予約ください。</p>
        </div>
      </div>
    `
  }),

  // サロン → 新規予約申請通知
  newReservation: (userEmail: string, menuName: string, date: string) => ({
    subject: `【Salon de Beauty】新しい予約申請が届きました`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;">
        <div style="background:linear-gradient(45deg,#F77737,#E1306C,#833AB4,#5851DB);padding:20px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:20px;">Salon de Beauty</h1>
        </div>
        <div style="padding:24px;">
          <p style="font-size:18px;font-weight:bold;">📅 新しい予約申請が届きました</p>
          <div style="background:#fdf2f8;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="margin:4px 0;"><strong>お客様：</strong>${userEmail}</p>
            <p style="margin:4px 0;"><strong>メニュー：</strong>${menuName}</p>
            <p style="margin:4px 0;"><strong>希望日時：</strong>${date}</p>
          </div>
          <p style="color:#9ca3af;font-size:12px;">※ 3日以内に承認またはキャンセルをしてください。</p>
          <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard"
            style="display:block;background:linear-gradient(45deg,#F77737,#E1306C,#833AB4,#5851DB);color:white;text-align:center;padding:12px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px;">
            管理画面で確認する
          </a>
        </div>
      </div>
    `
  }),

  // サロン → 予約確定完了通知
  salonReservationConfirmed: (userEmail: string, menuName: string, date: string) => ({
    subject: `【Salon de Beauty】予約を承認しました`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;">
        <div style="background:linear-gradient(45deg,#F77737,#E1306C,#833AB4,#5851DB);padding:20px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:20px;">Salon de Beauty</h1>
        </div>
        <div style="padding:24px;">
          <p style="font-size:18px;font-weight:bold;color:#2E7D32;">✅ 予約を承認しました</p>
          <div style="background:#f0fdf4;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="margin:4px 0;"><strong>お客様：</strong>${userEmail}</p>
            <p style="margin:4px 0;"><strong>メニュー：</strong>${menuName}</p>
            <p style="margin:4px 0;"><strong>日時：</strong>${date}</p>
          </div>
          <p>お客様にも確定メールが送信されました。</p>
        </div>
      </div>
    `
  }),

  // サロン → キャンセル通知
  salonReservationCancelled: (userEmail: string, menuName: string, date: string, reason: 'salon' | 'user') => ({
    subject: `【Salon de Beauty】予約がキャンセルされました`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;">
        <div style="background:linear-gradient(45deg,#F77737,#E1306C,#833AB4,#5851DB);padding:20px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:20px;">Salon de Beauty</h1>
        </div>
        <div style="padding:24px;">
          <p style="font-size:18px;font-weight:bold;color:#6b7280;">❌ 予約がキャンセルされました</p>
          <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="margin:4px 0;"><strong>お客様：</strong>${userEmail}</p>
            <p style="margin:4px 0;"><strong>メニュー：</strong>${menuName}</p>
            <p style="margin:4px 0;"><strong>日時：</strong>${date}</p>
          </div>
          <p>${reason === 'user' ? 'お客様によりキャンセルされました。' : 'サロン側でキャンセル処理を行いました。'}</p>
        </div>
      </div>
    `
  }),
}