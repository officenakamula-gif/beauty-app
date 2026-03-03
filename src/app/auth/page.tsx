'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'user' | 'salon'>('user')
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleAuth = async () => {
    setLoading(true)
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/')
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        // roleをprofilesに保存
        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            username: email,
            role: role
          })
        }
        alert('登録完了！')
        router.push('/')
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-pink-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-pink-600 mb-6">
          {isLogin ? 'ログイン' : '新規登録'}
        </h1>

        {/* 新規登録時のみ会員種別を表示 */}
        {!isLogin && (
          <div className="mb-4">
            <p className="text-sm font-bold text-gray-600 mb-2">会員種別</p>
            <div className="flex gap-3">
              <button
                onClick={() => setRole('user')}
                className={`flex-1 py-3 rounded-lg border-2 text-sm font-bold transition ${
                  role === 'user'
                    ? 'border-pink-500 bg-pink-50 text-pink-600'
                    : 'border-gray-200 text-gray-400'
                }`}
              >
                👤 一般ユーザー
                <p className="text-xs font-normal mt-1">サロンを予約する</p>
              </button>
              <button
                onClick={() => setRole('salon')}
                className={`flex-1 py-3 rounded-lg border-2 text-sm font-bold transition ${
                  role === 'salon'
                    ? 'border-pink-500 bg-pink-50 text-pink-600'
                    : 'border-gray-200 text-gray-400'
                }`}
              >
                💅 サロン
                <p className="text-xs font-normal mt-1">サロンを掲載する</p>
              </button>
            </div>
          </div>
        )}

        <input
          type="email"
          placeholder="メールアドレス"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full border rounded-lg p-3 mb-3 text-sm"
        />
        <input
          type="password"
          placeholder="パスワード"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full border rounded-lg p-3 mb-6 text-sm"
        />
        <button
          onClick={handleAuth}
          disabled={loading}
          className="w-full bg-pink-500 text-white py-3 rounded-lg font-bold disabled:opacity-50"
        >
          {loading ? '処理中...' : isLogin ? 'ログイン' : '登録'}
        </button>
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="w-full mt-4 text-pink-500 underline text-sm"
        >
          {isLogin ? '新規登録はこちら' : 'ログインはこちら'}
        </button>
      </div>
    </div>
  )
}