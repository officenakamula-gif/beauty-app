'use client'
import Link from 'next/link'

const grad = 'linear-gradient(45deg,#F77737,#E1306C,#833AB4,#5851DB)'
const gradText: any = { background: grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA' }}>
      <div style={{ background: '#333', color: '#ccc', fontSize: 11, textAlign: 'center', padding: '5px 0' }}>
        美容サロンの検索・予約サイト｜Salon de Beauty
      </div>
      <header style={{ background: 'white', borderBottom: '1px solid #DBDBDB', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center' }}>
        <Link href="/" style={{ fontSize: 20, fontWeight: 700, textDecoration: 'none', ...gradText }}>Salon de Beauty</Link>
      </header>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 32px 80px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, ...gradText }}>プライバシーポリシー</h1>
        <p style={{ fontSize: 12, color: '#737373', marginBottom: 40 }}>最終更新日：2026年3月24日</p>

        {[
          {
            title: '1. 収集する情報',
            body: '本サービスでは以下の情報を収集します。\n・氏名・メールアドレス・電話番号（登録時）\n・予約履歴・利用履歴\n・サロン情報（サロンオーナーの場合）\n・Googleアカウント情報（Google認証を利用した場合）'
          },
          {
            title: '2. 情報の利用目的',
            body: '収集した情報は以下の目的で使用します。\n・サービスの提供・運営\n・予約の管理・確認メールの送信\n・サービス改善のための分析\n・お知らせ・重要な連絡の送信'
          },
          {
            title: '3. 第三者提供',
            body: '収集した個人情報は、以下の場合を除き第三者に提供しません。\n・ユーザーの同意がある場合\n・法令に基づく開示が必要な場合\n・サービス提供に必要な業務委託先への提供（Supabase・Resend等）'
          },
          {
            title: '4. 情報の管理',
            body: '収集した個人情報はSupabase（データベース）にて適切に管理します。不正アクセス・漏洩防止のため、適切なセキュリティ対策を講じます。'
          },
          {
            title: '5. Cookieの使用',
            body: '本サービスはログイン状態の維持のためにCookieを使用します。ブラウザの設定によりCookieを無効にすることができますが、一部機能が利用できなくなる場合があります。'
          },
          {
            title: '6. 個人情報の開示・訂正・削除',
            body: 'ユーザーは自身の個人情報の開示・訂正・削除を請求できます。退会機能により、アカウントの利用停止が可能です。お問い合わせはメールにてご連絡ください。'
          },
          {
            title: '7. プライバシーポリシーの変更',
            body: '本ポリシーは必要に応じて変更することがあります。変更後は本ページに掲載します。'
          },
        ].map(section => (
          <div key={section.title} style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 10 }}>{section.title}</h2>
            <p style={{ fontSize: 13, color: '#555', lineHeight: 2.0, whiteSpace: 'pre-line' }}>{section.body}</p>
          </div>
        ))}

        <div style={{ borderTop: '1px solid #DBDBDB', paddingTop: 24, marginTop: 40 }}>
          <p style={{ fontSize: 12, color: '#737373' }}>お問い合わせ：officenakamula@gmail.com</p>
        </div>
      </div>

      <footer style={{ background: '#222', color: '#999', padding: '24px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: '#555', marginBottom: 12 }}>
          <Link href="/terms" style={{ color: '#777', textDecoration: 'none', margin: '0 12px' }}>利用規約</Link>
          <Link href="/privacy" style={{ color: '#777', textDecoration: 'none', margin: '0 12px' }}>プライバシーポリシー</Link>
          <Link href="/guide" style={{ color: '#777', textDecoration: 'none', margin: '0 12px' }}>ご利用ガイド</Link>
        </div>
        <div style={{ fontSize: 11, color: '#555' }}>© 2026 Salon de Beauty. All rights reserved.</div>
      </footer>
    </div>
  )
}
