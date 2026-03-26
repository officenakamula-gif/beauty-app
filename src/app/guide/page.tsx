'use client'
import Link from 'next/link'

const grad = 'linear-gradient(45deg,#F77737,#E1306C,#833AB4,#5851DB)'
const gradText: any = { background: grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }
const card: any = { background: 'white', borderRadius: 16, border: '1px solid #DBDBDB', padding: '24px 28px', marginBottom: 16 }
const stepNum: any = { width: 32, height: 32, borderRadius: '50%', background: grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'white', flexShrink: 0 }

export default function GuidePage() {
  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA' }}>
      <div style={{ background: '#333', color: '#ccc', fontSize: 11, textAlign: 'center', padding: '5px 0' }}>
        美容サロンの検索・予約サイト｜Salon de Beauty
      </div>
      <header className="sp-header" style={{ background: 'white', borderBottom: '1px solid #DBDBDB', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center' }}>
        <Link href="/" style={{ fontSize: 20, fontWeight: 700, textDecoration: 'none', ...gradText }}>Salon de Beauty</Link>
      </header>

      <div className="sp-content-main" style={{ maxWidth: 760, margin: '0 auto', padding: '40px 32px 80px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, ...gradText }}>ご利用ガイド</h1>
        <p style={{ fontSize: 13, color: '#737373', marginBottom: 40 }}>Salon de Beautyのご利用方法をご説明します。</p>

        {/* ユーザー向け */}
        <div style={{ fontSize: 18, fontWeight: 700, color: '#111', marginBottom: 16 }}>ユーザーの方</div>

        {[
          { n: 1, title: '会員登録', body: 'メールアドレスまたはGoogleアカウントで無料登録できます。登録後、メール内のリンクをクリックして認証を完了してください。' },
          { n: 2, title: 'サロンを探す', body: 'トップページからジャンル・エリア・キーワードで検索できます。気になるサロンのページを開いてメニューやスタイリスト情報を確認してください。' },
          { n: 3, title: '予約する', body: 'メニュー → スタイリスト → 日時の順で選んで予約申請します。サロンが承認すると予約確定メールが届きます。' },
          { n: 4, title: '予約の確認・キャンセル', body: 'マイページから予約状況を確認できます。キャンセルもマイページから行えます。' },
        ].map(s => (
          <div key={s.n} style={{ ...card, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={stepNum}>{s.n}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 6 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: '#555', lineHeight: 1.8 }}>{s.body}</div>
            </div>
          </div>
        ))}

        {/* サロン向け */}
        <div style={{ fontSize: 18, fontWeight: 700, color: '#111', marginBottom: 16, marginTop: 40 }}>サロンオーナーの方</div>

        {[
          { n: 1, title: '掲載申請', body: '新規登録ページから「サロン掲載」を選択し、サロン名・電話番号・担当者名を入力して申請します。運営者による確認後、掲載が開始されます。' },
          { n: 2, title: 'サロン情報を入力', body: 'ダッシュボードからサロン情報・メニュー・スタイリスト・写真を登録できます。掲載審査中から入力を進めておくことをおすすめします。' },
          { n: 3, title: '予約を管理する', body: 'ダッシュボードの予約管理タブから予約一覧を確認できます。承認・キャンセル操作もここから行えます。' },
          { n: 4, title: '料金について', body: 'ベータ期間中は完全無料でご利用いただけます。有料プランの提供開始時は事前にメールでご案内します。' },
        ].map(s => (
          <div key={s.n} style={{ ...card, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={stepNum}>{s.n}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 6 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: '#555', lineHeight: 1.8 }}>{s.body}</div>
            </div>
          </div>
        ))}

        {/* FAQ */}
        <div style={{ fontSize: 18, fontWeight: 700, color: '#111', marginBottom: 16, marginTop: 40 }}>よくある質問</div>

        {[
          { q: '予約後にキャンセルできますか？', a: 'はい、マイページからキャンセルできます。ただし、サロンによってはキャンセルポリシーが設けられている場合があります。' },
          { q: 'Googleアカウントで登録できますか？', a: 'はい、一般ユーザーとしての登録にGoogleアカウントが使えます。サロン掲載申請はメールアドレスでの登録が必要です。' },
          { q: '予約確定はいつになりますか？', a: 'サロンが承認した時点で予約確定となります。申請から3日以内に承認がない場合は自動的にキャンセルになります。' },
          { q: 'サロン掲載は有料ですか？', a: 'ベータ期間中は完全無料です。有料プラン開始時は事前にメールでお知らせします。' },
        ].map(item => (
          <div key={item.q} style={{ marginBottom: 16, background: 'white', borderRadius: 12, border: '1px solid #DBDBDB', padding: '18px 22px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#E1306C', marginBottom: 8 }}>Q. {item.q}</div>
            <div style={{ fontSize: 13, color: '#555', lineHeight: 1.8 }}>A. {item.a}</div>
          </div>
        ))}

        <div style={{ borderTop: '1px solid #DBDBDB', paddingTop: 24, marginTop: 40 }}>
          <p style={{ fontSize: 13, color: '#737373' }}>その他のご不明点はメールにてお問い合わせください。</p>
          <p style={{ fontSize: 13, color: '#737373', marginTop: 4 }}>お問い合わせ：officenakamula@gmail.com</p>
        </div>
      </div>

      <footer className="sp-footer" style={{ background: '#222', color: '#999', padding: '24px 32px', textAlign: 'center' }}>
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