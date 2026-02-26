// D:\dev\beauty-app\src\app\auth\page.tsx
export const dynamic = 'force-dynamic'
'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
 
export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
 
  const handleAuth = async () => {
    setLoading(true)
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        alert('確認メールを送信しました！')
      }
      router.push('/')
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
        <input type="email" placeholder="メールアドレス"
          value={email} onChange={e => setEmail(e.target.value)}
          className="w-full border rounded-lg p-3 mb-4" />
        <input type="password" placeholder="パスワード"
          value={password} onChange={e => setPassword(e.target.value)}
          className="w-full border rounded-lg p-3 mb-6" />
        <button onClick={handleAuth} disabled={loading}
          className="w-full bg-pink-500 text-white py-3 rounded-lg font-bold">
          {loading ? '処理中...' : isLogin ? 'ログイン' : '登録'}
        </button>
        <button onClick={() => setIsLogin(!isLogin)}
          className="w-full mt-4 text-pink-500 underline">
          {isLogin ? '新規登録はこちら' : 'ログインはこちら'}
        </button>
      </div>
    </div>
  )
}
