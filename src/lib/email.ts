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
    subject: `【BeautyBook】${salonName}への予約を受け付けました`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;">
        <div style="background:#ec4899;padding:20px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:20px;">💄 BeautyBook</h1>
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

  // ユーザー → 予約承認
  reservationConfirmed: (salonName: string, menuName: string, date: string) => ({
    subject: `【BeautyBook】予約が確定しました！`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;">
        <div style="background:#ec4899;padding:20px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:20px;">💄 BeautyBook</h1>
        </div>
        <div style="padding:24px;">
          <p style="font-size:18px;font-weight:bold;color:#ec4899;">✅ 予約が確定しました！</p>
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

  // ユーザー → 予約キャンセル・タイムアウト
  reservationCancelled: (salonName: string, reason: 'cancelled' | 'expired') => ({
    subject: `【BeautyBook】予約が${reason === 'expired' ? 'タイムアウト' : 'キャンセル'}になりました`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;">
        <div style="background:#ec4899;padding:20px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:20px;">💄 BeautyBook</h1>
        </div>
        <div style="padding:24px;">
          <p style="font-size:18px;font-weight:bold;color:#6b7280;">
            ${reason === 'expired' ? '⏱ 予約がタイムアウトになりました' : '❌ 予約がキャンセルになりました'}
          </p>
          <p><strong>${salonName}</strong>への予約が${reason === 'expired' ? '承認期限を過ぎたため自動的にキャンセル' : 'サロンによりキャンセル'}されました。</p>
          <p>他のサロンや日時で再度ご予約ください。</p>
        </div>
      </div>
    `
  }),

  // サロン → 新規予約通知
  newReservation: (userName: string, menuName: string, date: string) => ({
    subject: `【BeautyBook】新しい予約申請が届きました`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;">
        <div style="background:#ec4899;padding:20px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:20px;">💄 BeautyBook</h1>
        </div>
        <div style="padding:24px;">
          <p style="font-size:18px;font-weight:bold;">📅 新しい予約申請が届きました</p>
          <div style="background:#fdf2f8;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="margin:4px 0;"><strong>メニュー：</strong>${menuName}</p>
            <p style="margin:4px 0;"><strong>希望日時：</strong>${date}</p>
          </div>
          <p style="color:#9ca3af;font-size:12px;">※ 3日以内に承認またはキャンセルをしてください。期限を過ぎると自動的にタイムアウトになります。</p>
          <a href="https://beauty-app-mhst.vercel.app/dashboard" 
            style="display:block;background:#ec4899;color:white;text-align:center;padding:12px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px;">
            管理画面で確認する
          </a>
        </div>
      </div>
    `
  }),
}