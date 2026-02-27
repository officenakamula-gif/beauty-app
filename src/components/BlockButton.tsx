'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function BlockButton({ salonId }: { salonId: string }) {
  const [blocked, setBlocked] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => { checkBlocked() }, [salonId])

  const checkBlocked = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('blocks')
      .select('id')
      .eq('blocker_id', user.id)
      .eq('blocked_salon_id', salonId)
      .maybeSingle()
    setBlocked(!!data)
  }

  const handleToggle = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { alert('ログインしてください'); return }
    setLoading(true)
    try {
      if (blocked) {
        await supabase.from('blocks').delete()
          .eq('blocker_id', user.id)
          .eq('blocked_salon_id', salonId)
        setBlocked(false)
        alert('ブロックを解除しました')
      } else {
        if (!confirm('このサロンをブロックしますか？\n検索結果に表示されなくなります。')) {
          setLoading(false)
          return
        }
        await supabase.from('blocks').insert({
          blocker_id: user.id,
          blocked_salon_id: salonId
        })
        setBlocked(true)
        alert('ブロックしました')
      }
    } catch (err: any) {
      alert(err.message)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`text-xs px-3 py-1 rounded-full font-bold transition ${
        blocked
          ? 'bg-gray-200 text-gray-600'
          : 'bg-red-100 text-red-600'
      }`}
    >
      {loading ? '...' : blocked ? '🔓 解除' : '🚫 ブロック'}
    </button>
  )
}