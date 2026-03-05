'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const [tab, setTab] = useState<'user' | 'salon'>('user')
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const reset = () => { setEmail(''); setPassword(''); setIsLogin(true) }

  const handleAuth = async () => {
    setLoading(true)
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        // ログイン後にroleを確認してリダイレクト
        const { data: prof } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
        if (prof?.role === 'salon') {
          router.push('/dashboard')
        } else {
          router.push('/')
        }
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            username: email,
            role: tab
          })
        }
        alert('登録完了！')
        if (tab === 'salon') router.push('/dashboard')
        else router.push('/')
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-pink-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md">

        {/* タブ切替 */}
        <div className="flex rounded-t-2xl overflow-hidden">
          <button onClick={() => { setTab('user'); reset() }}
            className={`flex-1 py-4 text-sm font-bold transition ${
              tab === 'user' ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-400'
            }`}>
            👤 ユーザー
          </button>
          <button onClick={() => { setTab('salon'); reset() }}
            className={`flex-1 py-4 text-sm font-bold transition ${
              tab === 'salon' ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-400'
            }`}>
            💅 サロン
          </button>
        </div>

        <div className="p-8">
          <h1 className="text-xl font-bold text-center text-gray-800 mb-1">
            {tab === 'user' ? 'ユーザー' : 'サロン'}
            {isLogin ? 'ログイン' : '新規登録'}
          </h1>
          <p className="text-xs text-center text-gray-400 mb-6">
            {tab === 'salon' ? 'ログイン後、管理画面へ移動します' : '予約・ブロック機能が使えます'}
          </p>

          <input type="email" placeholder="メールアドレス"
            value={email} onChange={e => setEmail(e.target.value)}
            className="w-full border rounded-lg p-3 mb-3 text-sm" />
          <input type="password" placeholder="パスワード"
            value={password} onChange={e => setPassword(e.target.value)}
            className="w-full border rounded-lg p-3 mb-6 text-sm" />

          <button onClick={handleAuth} disabled={loading}
            className="w-full bg-pink-500 text-white py-3 rounded-lg font-bold disabled:opacity-50">
            {loading ? '処理中...' : isLogin ? 'ログイン' : '登録する'}
          </button>

          <button onClick={() => setIsLogin(!isLogin)}
            className="w-full mt-4 text-pink-500 underline text-sm">
            {isLogin ? '新規登録はこちら' : 'ログインはこちら'}
          </button>
        </div>
      </div>
    </div>
  )
}