'use client'
import Link from 'next/link'

const grad = 'linear-gradient(45deg,#F77737,#E1306C,#833AB4,#5851DB)'
const gradText: any = { background: grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }

export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA' }}>
      <div style={{ background: '#333', color: '#ccc', fontSize: 11, textAlign: 'center', padding: '5px 0' }}>
        美容サロンの検索・予約サイト｜Salon de Beauty
      </div>
      <header style={{ background: 'white', borderBottom: '1px solid #DBDBDB', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center' }}>
        <Link href="/" style={{ fontSize: 20, fontWeight: 700, textDecoration: 'none', ...gradText }}>Salon de Beauty</Link>
      </header>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 32px 80px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, ...gradText }}>利用規約</h1>
        <p style={{ fontSize: 12, color: '#737373', marginBottom: 40 }}>最終更新日：2026年3月24日</p>

        {[
          {
            title: '第1条（適用）',
            body: '本規約は、Salon de Beauty（以下「本サービス」）の利用に関する条件を定めるものです。ユーザーおよびサロンオーナーは本規約に同意した上で本サービスをご利用ください。'
          },
          {
            title: '第2条（利用登録）',
            body: '本サービスへの登録は、所定の手順に従い行うものとします。虚偽の情報による登録は禁止します。サロン掲載については、運営者による審査を経て掲載が開始されます。'
          },
          {
            title: '第3条（禁止事項）',
            body: '以下の行為を禁止します。\n・法令または公序良俗に違反する行為\n・虚偽の情報を登録する行為\n・スパム・いたずら目的での掲載申請\n・他のユーザーまたはサロンへの迷惑行為\n・本サービスの運営を妨害する行為'
          },
          {
            title: '第4条（サービスの変更・停止）',
            body: '運営者は、ユーザーへの事前通知なく本サービスの内容を変更、または提供を停止することがあります。これによってユーザーに生じた損害について、運営者は責任を負いません。'
          },
          {
            title: '第5条（免責事項）',
            body: '運営者は、本サービスを通じて行われた予約・取引について、サロンとユーザー間のトラブルに関して責任を負いません。ユーザーは自己の責任において本サービスを利用するものとします。'
          },
          {
            title: '第6条（料金）',
            body: 'ベータ期間中は無料でサービスをご利用いただけます。有料プランの提供開始時は、事前にメールにてご案内します。'
          },
          {
            title: '第7条（退会）',
            body: 'ユーザーおよびサロンオーナーはいつでも退会できます。退会後も予約履歴等のデータは運営者が保持します。'
          },
          {
            title: '第8条（規約の変更）',
            body: '運営者は必要に応じて本規約を変更することがあります。変更後は本ページに掲載し、継続利用をもって同意とみなします。'
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
