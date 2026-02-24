// D:\dev\beauty-app\src\hooks\useBlock.ts
import { supabase } from '@/lib/supabase'
 
export const useBlock = () => {
  const blockSalon = async (salonId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('ログインが必要です')
    const { error } = await supabase.from('blocks').insert({
      blocker_id: user.id, blocked_salon_id: salonId
    })
    if (error) throw error
  }
 
  const unblockSalon = async (salonId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('ログインが必要です')
    await supabase.from('blocks').delete()
      .eq('blocker_id', user.id).eq('blocked_salon_id', salonId)
  }
 
  const isBlocked = async (salonId: string): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { data } = await supabase.from('blocks').select('id')
      .eq('blocker_id', user.id).eq('blocked_salon_id', salonId).single()
    return !!data
  }
 
  return { blockSalon, unblockSalon, isBlocked }
}
