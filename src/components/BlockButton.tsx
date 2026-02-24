// D:\dev\beauty-app\src\components\BlockButton.tsx
'use client'
import { useState, useEffect } from 'react'
import { useBlock } from '@/hooks/useBlock'
 
export default function BlockButton({ salonId }: { salonId: string }) {
  const [blocked, setBlocked] = useState(false)
  const [loading, setLoading] = useState(false)
  const { blockSalon, unblockSalon, isBlocked } = useBlock()
 
  useEffect(() => { isBlocked(salonId).then(setBlocked) }, [salonId])
 
  const handleToggle = async () => {
    setLoading(true)
    try {
      if (blocked) {
        await unblockSalon(salonId)
        setBlocked(false)
        alert('ブロックを解除しました')
      } else {
        if (!confirm('このサロンをブロックしますか？')) return
        await blockSalon(salonId)
        setBlocked(true)
        alert('ブロックしました')
      }
    } catch (err: any) { alert(err.message) }
    finally { setLoading(false) }
  }
 
  return (
    <button onClick={handleToggle} disabled={loading}
      className={`px-4 py-2 rounded-lg text-sm font-medium ${ blocked
        ? 'bg-gray-200 text-gray-600' : 'bg-red-100 text-red-600'}`}>
      {loading ? '処理中...' : blocked ? '🔓 ブロック解除' : '🚫 ブロック'}
    </button>
  )
}
