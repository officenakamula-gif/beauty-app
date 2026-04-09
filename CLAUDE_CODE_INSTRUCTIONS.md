# Claude Code 作業指示書

## プロジェクト概要
- beauty-app（Next.js + Supabase + Vercel）
- ローカルパス: `D:\dev\beauty-app`
- 本番URL: https://beauty-app-mhst.vercel.app
- GitHub: https://github.com/officenakamula-gif/beauty-app
- Node.js / npm が使用可能な環境で作業すること

## ルール
- gitコミットメッセージは**日本語**
- `git add . && git commit -m "メッセージ" && git push origin main` の形式
- モバイル対応はCSSクラス＋`@media`のみ（インラインstyle変更禁止）

---

## 作業内容：Stripe事前決済の実装

### 現在完了済みの作業

#### DBマイグレーション（Supabase済み）
- `salons.use_prepayment` boolean DEFAULT true ✅
- `reservations.stripe_payment_intent_id` text ✅
- `reservations.payment_status` text DEFAULT 'unpaid' ✅

#### 作成済みファイル（コードは書き込み済み）
- `src/app/api/stripe/create-payment-intent/route.ts` ✅
- `src/app/api/stripe/capture/route.ts` ✅
- `src/app/api/stripe/cancel/route.ts` ✅
- `src/app/api/stripe/webhook/route.ts` ✅
- `src/app/dashboard/page.tsx`（use_prepaymentトグル追加済み）✅
- `src/app/salons/[id]/page.tsx`（STEP4決済UI追加済み）✅

#### Vercel環境変数（設定済み）
- `STRIPE_SECRET_KEY`（sk_test_...）
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`（pk_test_...）
- `STRIPE_WEBHOOK_SECRET`（未設定・後で追加）

---

### Claude Codeへの依頼タスク

#### タスク1：ビルドエラーの確認と修正

```bash
cd D:\dev\beauty-app
npm run build
```

エラーが出た場合は内容を確認して修正すること。
主に以下の点を確認：
- `src/app/api/stripe/*/route.ts` のStripe APIバージョン文字列が正しいか
- `src/app/salons/[id]/page.tsx` のTypeScriptエラー
- `src/app/dashboard/page.tsx` のTypeScriptエラー
- `@stripe/stripe-js` のimportが正しいか

#### タスク2：Stripe APIバージョンの修正

`src/app/api/stripe/create-payment-intent/route.ts` 内の：
```ts
new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-12-18.acacia' })
```

APIバージョンは最新の正しいものに修正すること。
以下コマンドで確認可能：
```bash
node -e "const Stripe = require('stripe'); console.log(Stripe.LATEST_API_VERSION)"
```

同じ修正を以下の全ファイルに適用：
- `src/app/api/stripe/capture/route.ts`
- `src/app/api/stripe/cancel/route.ts`
- `src/app/api/stripe/webhook/route.ts`

#### タスク3：salons/[id]/page.tsx の決済フロー修正

現在の`makeReservation`関数内でのStripe決済部分（テスト用トークン使用）は本番対応に修正が必要。

**現在のコード（要修正）：**
```ts
const { error: stripeError } = await stripe.confirmCardPayment(clientSecret, {
  payment_method: { card: { token: 'tok_visa' } as any }, // テスト用
})
```

**修正方針：**
事前決済はPaymentIntentを作成してclientSecretをDBに保存するだけにとどめる。
実際のカード入力UIはStripe Elementsで別途実装する必要があるため、
今は「予約申請→PaymentIntent作成（オーソリ）→サロン承認でキャプチャ」の流れを維持しつつ、
`confirmCardPayment`の呼び出しを削除し、PaymentIntentの作成のみ行うよう修正する。

具体的には`makeReservation`内の以下の部分を修正：
```ts
// 事前決済：PaymentIntent作成（オーソリ仮押さえ）
// Stripe Elementsは別途実装予定のため、今はIntentの作成のみ
if (salon.use_prepayment) {
  try {
    await fetch('/api/stripe/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reservationId: newRes.id,
        amount: selectedMenu.price,
        salonName: salon.name,
        menuName: selectedMenu.name,
      }),
    })
  } catch (e) {
    console.error('Payment intent creation error:', e)
  }
}
```

`loadStripe`のimportも不要なら削除してOK。

#### タスク4：ビルド確認後にgit push

```bash
npm run build
# エラーが出なければ：
git add .
git commit -m "Stripe事前決済機能を実装（PaymentIntent作成・キャプチャ・キャンセルAPI）"
git push origin main
```

---

### 参考：Stripeの全体フロー（設計）

```
ユーザーが予約申請
  ↓
/api/stripe/create-payment-intent にPOST
  → PaymentIntent作成（capture_method: manual）
  → reservations.stripe_payment_intent_id に保存
  → reservations.payment_status = 'authorized'
  ↓
サロンが承認
  → updateReservationStatus('confirmed')
  → /api/stripe/capture にPOST
  → paymentIntents.capture() 実行
  → payment_status = 'captured'（引き落とし確定）

サロンが拒否 or 3日自動キャンセル
  → /api/stripe/cancel にPOST
  → paymentIntents.cancel() 実行
  → payment_status = 'released'（仮押さえ解除）
```

### 参考：Vercel環境変数（未設定のもの）

webhookエンドポイントをStripeダッシュボードで設定後：
- URL: `https://beauty-app-mhst.vercel.app/api/stripe/webhook`
- イベント: `payment_intent.amount_capturable_updated`, `payment_intent.succeeded`, `payment_intent.canceled`
- 発行される `whsec_...` を `STRIPE_WEBHOOK_SECRET` としてVercelに追加

---

### 参考：技術スタック
- Next.js 16.x（App Router）
- Supabase（プロジェクトID: xrxcmwkzvvcedsyfasbi）
- Stripe（stripe: ^20.3.1, @stripe/stripe-js: ^8.8.0）
- TypeScript
- Vercel（Hobbyプラン）
