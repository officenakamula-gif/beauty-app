'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { REGIONS } from '@/lib/areas'
import { GENRE_GROUPS, getGenresByCategory } from '@/lib/genres'
import { DAY_NAMES } from '@/lib/availability'
import Link from 'next/link'

const GENRES = ['ヘアサロン', 'ネイル・まつげ', 'リラク・エステ・脱毛']

const grad = 'linear-gradient(45deg,#F77737,#E1306C,#833AB4,#5851DB)'
const gradText: any = { background: grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }

const getAreasForPref = (pref: string): string[] => {
    for (const region of Object.values(REGIONS)) {
        if (region[pref]) return region[pref]
    }
    return []
}

const findPrefForArea = (area: string): string => {
    for (const region of Object.values(REGIONS)) {
        for (const [pref, areas] of Object.entries(region)) {
            if (areas.includes(area)) return pref
        }
    }
    return '北海道'
}

const inputStyle: any = { width: '100%', border: '1.5px solid #DBDBDB', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontFamily: 'inherit', outline: 'none', color: '#111', background: '#FAFAFA' }
const labelStyle: any = { fontSize: 12, fontWeight: 700, color: '#737373', display: 'block', marginBottom: 6 }

export default function DashboardPage() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [salon, setSalon] = useState<any>(null)
    const [menus, setMenus] = useState<any[]>([])
    const [stylists, setStylists] = useState<any[]>([])
    const [reservations, setReservations] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [tab, setTab] = useState<'stats' | 'salon' | 'menus' | 'stylists' | 'photos' | 'reservations' | 'users' | 'messages'>('stats')
    const [salonUsers, setSalonUsers] = useState<any[]>([])
    const [blocks, setBlocks] = useState<any[]>([])
    const [withdrawing, setWithdrawing] = useState(false)
    const [salonPhotos, setSalonPhotos] = useState<any[]>([])
    const [stylistPhotos, setStylistPhotos] = useState<any[]>([])
    const [photoUploading, setPhotoUploading] = useState(false)


    const topImageRef = useRef<HTMLInputElement>(null)
    const galleryRef = useRef<HTMLInputElement>(null)

    const [salonForm, setSalonForm] = useState({
        name: '', genre: 'ヘアサロン', sub_genre: '', prefecture: '北海道', area: '札幌市中央区',
        address: '', nearest_station: '', description: '', phone: '', slot_interval: 30,
        bank_name: '', bank_branch: '', bank_account_type: 'savings',
        bank_account_number: '', bank_account_name: '',
    })
    const [menuForm, setMenuForm] = useState({ name: '', price: '', duration: '', description: '' })
    const [stylistForm, setStylistForm] = useState({ name: '', role: '', experience_years: '', description: '', instagram: '' })
    const [stylistImageFile, setStylistImageFile] = useState<File | null>(null)
    const [stylistImagePreview, setStylistImagePreview] = useState('')
    const [editingScheduleStylistId, setEditingScheduleStylistId] = useState<string | null>(null)
    const [scheduleForm, setScheduleForm] = useState<any[]>([])
    const [scheduleSaving, setScheduleSaving] = useState(false)
    const [csvMonth, setCsvMonth] = useState(() => {
        const d = new Date()
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    })

    useEffect(() => { init() }, [])

    const init = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/auth'); return }
        setUser(user)
        const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (prof?.role !== 'salon') { router.push('/'); return }
        const { data: salonData } = await supabase.from('salons').select('*').eq('owner_id', user.id).maybeSingle()
        if (salonData) {
            setSalon(salonData)
            const pref = findPrefForArea(salonData.area)
            setSalonForm({
                name: salonData.name || '', genre: salonData.genre || 'ヘアサロン', sub_genre: salonData.sub_genre || '', prefecture: pref,
                area: salonData.area || '', address: salonData.address || '',
                nearest_station: salonData.nearest_station || '', description: salonData.description || '',
                phone: salonData.phone || '', slot_interval: salonData.slot_interval || 30,
                bank_name: salonData.bank_name || '', bank_branch: salonData.bank_branch || '',
                bank_account_type: salonData.bank_account_type || 'savings',
                bank_account_number: salonData.bank_account_number || '', bank_account_name: salonData.bank_account_name || '',
            })
            const { data: menuData } = await supabase.from('menus').select('*').eq('salon_id', salonData.id)
            setMenus(menuData || [])
            const { data: stylistData } = await supabase.from('stylists').select('*').eq('salon_id', salonData.id)
            setStylists(stylistData || [])
            const { data: resData } = await supabase.from('reservations')
                .select('*, menus(name, price), stylists(name)').eq('salon_id', salonData.id)
                .order('reserved_at', { ascending: false })
            setReservations(resData || [])

            

            // 予約ユーザーを集計
            if (resData && resData.length > 0) {
                const userMap: Record<string, any> = {}
                for (const res of resData) {
                    if (!userMap[res.user_id]) {
                        userMap[res.user_id] = {
                            user_id: res.user_id,
                            reservations: [],
                        }
                    }
                    userMap[res.user_id].reservations.push(res)
                }
                const userIds = Object.keys(userMap)
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('id, username, full_name, phone')
                    .in('id', userIds)
                for (const prof of profileData || []) {
                    if (userMap[prof.id]) {
                        userMap[prof.id].email = prof.username
                        userMap[prof.id].full_name = prof.full_name || null
                        userMap[prof.id].phone = prof.phone || null
                    }
                }
                setSalonUsers(Object.values(userMap))
            }

            const { data: blockData } = await supabase
                .from('blocks')
                .select('*')
                .eq('blocker_id', user.id)
            setBlocks(blockData || [])
        }
        // 写真取得
            if (salonData) {
                const { data: spData } = await supabase.from('salon_photos').select('*').eq('salon_id', salonData.id).order('created_at', { ascending: false })
                setSalonPhotos(spData || [])
                const { data: stpData } = await supabase.from('stylist_photos').select('*').eq('salon_id', salonData.id).order('created_at', { ascending: false })
                setStylistPhotos(stpData || [])
            }
        setLoading(false)
    }

    const uploadImage = async (file: File, path: string): Promise<string | null> => {
        const ext = file.name.split('.').pop()
        const fileName = `${path}/${Date.now()}.${ext}`
        const { error } = await supabase.storage.from('salon-images').upload(fileName, file, { upsert: true })
        if (error) { alert('アップロード失敗: ' + error.message); return null }
        const { data } = supabase.storage.from('salon-images').getPublicUrl(fileName)
        return data.publicUrl
    }

    const handleTopImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!salon || !e.target.files?.[0]) return
        setUploading(true)
        const url = await uploadImage(e.target.files[0], `salons/${salon.id}/top`)
        if (url) { await supabase.from('salons').update({ top_image: url }).eq('id', salon.id); setSalon({ ...salon, top_image: url }) }
        setUploading(false)
    }

    const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!salon || !e.target.files) return
        setUploading(true)
        const files = Array.from(e.target.files)
        const urls: string[] = []
        for (const file of files) {
            const url = await uploadImage(file, `salons/${salon.id}/gallery`)
            if (url) urls.push(url)
        }
        const newGallery = [...(salon.gallery_images || []), ...urls]
        await supabase.from('salons').update({ gallery_images: newGallery }).eq('id', salon.id)
        setSalon({ ...salon, gallery_images: newGallery })
        setUploading(false)
    }

    const deleteGalleryImage = async (url: string) => {
        if (!confirm('この画像を削除しますか？')) return
        const newGallery = (salon.gallery_images || []).filter((u: string) => u !== url)
        await supabase.from('salons').update({ gallery_images: newGallery }).eq('id', salon.id)
        setSalon({ ...salon, gallery_images: newGallery })
    }

    const saveSalon = async () => {
        if (!salonForm.name) { alert('サロン名は必須です'); return }
        if (!salonForm.area) { alert('エリアを選択してください'); return }
        if (!salonForm.address) { alert('住所は必須です'); return }
        if (!salonForm.phone) { alert('電話番号は必須です'); return }
        if (!salonForm.description || salonForm.description.trim().length < 10) { alert('説明文は10文字以上入力してください'); return }
        setSaving(true)
        const payload = {
            name: salonForm.name, genre: salonForm.genre, sub_genre: salonForm.sub_genre || null, area: salonForm.area,
            address: salonForm.address, nearest_station: salonForm.nearest_station,
            description: salonForm.description, phone: salonForm.phone, slot_interval: salonForm.slot_interval,
        }
        if (salon) {
            const { error } = await supabase.from('salons').update(payload).eq('id', salon.id)
            if (error) { alert('エラー: ' + error.message); setSaving(false); return }
            alert('更新しました')
        } else {
            const { data, error } = await supabase.from('salons').insert({ ...payload, owner_id: user.id, is_active: true }).select().single()
            if (error) { alert('エラー: ' + error.message); setSaving(false); return }
            setSalon(data)
            alert('サロンを登録しました')
        }
        setSaving(false); init()
    }

    const addMenu = async () => {
        if (!salon) { alert('先にサロン情報を保存してください'); return }
        if (!menuForm.name || !menuForm.price || !menuForm.duration) { alert('名前・料金・時間は必須です'); return }
        const { error } = await supabase.from('menus').insert({
            salon_id: salon.id, name: menuForm.name, price: parseInt(menuForm.price),
            duration: parseInt(menuForm.duration), description: menuForm.description || null,
        })
        if (error) { alert('エラー: ' + error.message); return }
        setMenuForm({ name: '', price: '', duration: '', description: '' })
        const { data } = await supabase.from('menus').select('*').eq('salon_id', salon.id)
        setMenus(data || [])
    }

    const deleteMenu = async (id: string) => {
        if (!confirm('削除しますか？')) return
        await supabase.from('menus').delete().eq('id', id)
        setMenus(menus.filter(m => m.id !== id))
    }

    const addStylist = async () => {
        if (!salon) { alert('先にサロン情報を保存してください'); return }
        if (!stylistForm.name) { alert('スタイリスト名は必須です'); return }
        setUploading(true)
        let imageUrl = null
        if (stylistImageFile) imageUrl = await uploadImage(stylistImageFile, `salons/${salon.id}/stylists`)
        const { error } = await supabase.from('stylists').insert({
            salon_id: salon.id, name: stylistForm.name, role: stylistForm.role,
            experience_years: stylistForm.experience_years ? parseInt(stylistForm.experience_years) : null,
            description: stylistForm.description, instagram: stylistForm.instagram, image_url: imageUrl,
        })
        if (error) { alert('エラー: ' + error.message); setUploading(false); return }
        setStylistForm({ name: '', role: '', experience_years: '', description: '', instagram: '' })
        setStylistImageFile(null); setStylistImagePreview('')
        const { data } = await supabase.from('stylists').select('*').eq('salon_id', salon.id)
        setStylists(data || [])
        setUploading(false)
    }

    const deleteStylist = async (id: string) => {
        if (!confirm('削除しますか？')) return
        await supabase.from('stylists').delete().eq('id', id)
        setStylists(stylists.filter(s => s.id !== id))
    }

    const openScheduleEditor = async (stylistId: string) => {
        const { data } = await supabase.from('stylist_schedules').select('*').eq('stylist_id', stylistId)
        const existing = data || []
        const defaultForm = [0, 1, 2, 3, 4, 5, 6].map(dow => {
            const found = existing.find((s: any) => s.day_of_week === dow)
            return found || { stylist_id: stylistId, day_of_week: dow, is_day_off: dow === 0 || dow === 1, start_time: '10:00', end_time: '19:00' }
        })
        setScheduleForm(defaultForm)
        setEditingScheduleStylistId(stylistId)
    }

    const saveSchedule = async () => {
        if (!editingScheduleStylistId) return
        setScheduleSaving(true)
        for (const s of scheduleForm) {
            if (s.id) {
                await supabase.from('stylist_schedules').update({ is_day_off: s.is_day_off, start_time: s.start_time, end_time: s.end_time }).eq('id', s.id)
            } else {
                await supabase.from('stylist_schedules').insert({ stylist_id: s.stylist_id, day_of_week: s.day_of_week, is_day_off: s.is_day_off, start_time: s.start_time, end_time: s.end_time })
            }
        }
        setScheduleSaving(false)
        setEditingScheduleStylistId(null)
        alert('スケジュールを保存しました')
    }

    const updateReservationStatus = async (id: string, status: string) => {
        await supabase.from('reservations').update({ status }).eq('id', id)
        setReservations(reservations.map(r => r.id === id ? { ...r, status } : r))
    }

    const blockUser = async (userId: string, salonId: string) => {
        if (!confirm('このユーザーをブロックしますか？\n今後このサロンへの予約ができなくなります。')) return
        const { error } = await supabase.from('blocks').insert({
            blocker_id: user.id,
            blocked_id: userId,
            blocked_salon_id: salonId,
        })
        if (error) { alert('エラー: ' + error.message); return }
        const { data } = await supabase.from('blocks').select('*').eq('blocker_id', user.id)
        setBlocks(data || [])
        alert('ブロックしました')
    }

    const unblockUser = async (userId: string) => {
        if (!confirm('ブロックを解除しますか？')) return
        await supabase.from('blocks').delete()
            .eq('blocker_id', user.id)
            .eq('blocked_id', userId)
        const { data } = await supabase.from('blocks').select('*').eq('blocker_id', user.id)
        setBlocks(data || [])
        alert('ブロックを解除しました')
    }

    const uploadSalonPhoto = async (file: File, category: string) => {
        if (!salon) return
        setPhotoUploading(true)
        const url = await uploadImage(file, `salons/${salon.id}/photos`)
        if (url) {
            await supabase.from('salon_photos').insert({ salon_id: salon.id, image_url: url, category })
            const { data } = await supabase.from('salon_photos').select('*').eq('salon_id', salon.id).order('created_at', { ascending: false })
            setSalonPhotos(data || [])
        }
        setPhotoUploading(false)
    }

    const deleteSalonPhoto = async (photoId: string) => {
        if (!confirm('この写真を削除しますか？')) return
        await supabase.from('salon_photos').delete().eq('id', photoId)
        setSalonPhotos(salonPhotos.filter(p => p.id !== photoId))
    }

    const uploadStylistPhoto = async (file: File, stylistId: string) => {
        if (!salon) return
        setPhotoUploading(true)
        const url = await uploadImage(file, `salons/${salon.id}/stylist_photos`)
        if (url) {
            await supabase.from('stylist_photos').insert({ stylist_id: stylistId, salon_id: salon.id, image_url: url })
            const { data } = await supabase.from('stylist_photos').select('*').eq('salon_id', salon.id).order('created_at', { ascending: false })
            setStylistPhotos(data || [])
        }
        setPhotoUploading(false)
    }

    const deleteStylistPhoto = async (photoId: string) => {
        if (!confirm('この写真を削除しますか？')) return
        await supabase.from('stylist_photos').delete().eq('id', photoId)
        setStylistPhotos(stylistPhotos.filter(p => p.id !== photoId))
    }

    const uploadMenuImage = async (file: File, menuId: string) => {
        setPhotoUploading(true)
        const url = await uploadImage(file, `salons/${salon.id}/menu_photos`)
        if (url) {
            await supabase.from('menus').update({ image_url: url }).eq('id', menuId)
            const { data } = await supabase.from('menus').select('*').eq('salon_id', salon.id)
            setMenus(data || [])
        }
        setPhotoUploading(false)
    }

    const downloadCSV = async () => {
        const [year, mon] = csvMonth.split('-').map(Number)
        const from = new Date(year, mon - 1, 1).toISOString()
        const to = new Date(year, mon, 1).toISOString()

        const { data } = await supabase
            .from('reservations')
            .select('*, menus(name, price, duration), stylists(name)')
            .eq('salon_id', salon.id)
            .eq('status', 'completed')
            .gte('completed_at', from)
            .lt('completed_at', to)
            .order('completed_at', { ascending: true })

        if (!data || data.length === 0) { alert('該当月の売上データがありません'); return }

        const fee = 0.05
        const transferFee = 330

        // 発行日・対象期間
        const issueDate = new Date().toLocaleDateString('ja-JP')
        const periodStart = new Date(year, mon - 1, 1).toLocaleDateString('ja-JP')
        const periodEnd = new Date(year, mon, 0).toLocaleDateString('ja-JP')
        const period = `${periodStart} 〜 ${periodEnd}`

        // 支払期限（翌月末日）
        const payDueDate = new Date(year, mon + 1, 0).toLocaleDateString('ja-JP')

        // 発行者情報ブロック
        const issuerBlock = [
            ['発行者', 'Salon de Beauty'],
            ['連絡先', 'officenakamula@gmail.com'],
            ['発行日', issueDate],
            ['対象期間', period],
            ['サロン名', salon.name || ''],
            [],
        ]

        // 明細ヘッダー
        const header = ['来店日', 'メニュー', 'スタイリスト', '金額（税込）']

        // 明細行（手数料・振込対象は集計欄のみ）
        const rows = data.map((r: any) => {
            const price = r.menus?.price || 0
            return [
                new Date(r.completed_at).toLocaleDateString('ja-JP'),
                r.menus?.name || '',
                r.stylists?.name || '指名なし',
                price,
            ]
        })

        // 集計ブロック
        const totalSales = data.reduce((sum: number, r: any) => sum + (r.menus?.price || 0), 0)
        const totalFee = Math.floor(totalSales * fee)
        const payout = totalSales - totalFee - transferFee

        const summary = [
            [],
            ['売上合計（税込）', '', '', totalSales],
            ['手数料5%（税込）', '', '', -totalFee],
            ['振込手数料（税込）', '', '', -transferFee],
            ['振込予定額', '', '', payout],
            [],
            ['支払期限', payDueDate, '', ''],
        ]

        const csvContent = [
            ...issuerBlock,
            header,
            ...rows,
            ...summary,
        ]
            .map(row => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n')

        const bom = '\uFEFF'
        const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `売上明細_${salon.name}_${csvMonth}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    const handleWithdraw = async () => {
        if (!confirm('退会しますか？\n\nサロン情報・予約データは保持されますが、ログインできなくなります。\nこの操作は取り消せません。')) return
        if (!confirm('本当に退会しますか？')) return
        setWithdrawing(true)
        try {
            await supabase.from('profiles').update({
                is_deleted: true,
                deleted_at: new Date().toISOString(),
            }).eq('id', user.id)
            await supabase.auth.signOut()
            alert('退会処理が完了しました。ご利用ありがとうございました。')
            router.push('/')
        } catch (err: any) {
            alert('エラーが発生しました: ' + err.message)
            setWithdrawing(false)
        }
    }

    if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: '#737373' }}>読み込み中...</div></div>

    const statusConfig: any = {
        pending: { label: '承認待ち', bg: '#FFF8E1', color: '#F57F17' },
        confirmed: { label: '承認済', bg: '#E8F5E9', color: '#2E7D32' },
        cancelled: { label: 'キャンセル', bg: '#FFEBEE', color: '#C62828' },
        completed: { label: '完了', bg: '#F3E5F5', color: '#6A1B9A' },
        expired: { label: 'タイムアウト', bg: '#FAFAFA', color: '#737373' },
    }

    const tabList = [
        { key: 'stats', label: '統計' },
        { key: 'salon', label: 'サロン情報' },
        { key: 'menus', label: 'メニュー' },
        { key: 'stylists', label: 'スタイリスト' },
        { key: 'photos', label: '写真管理' },
        { key: 'reservations', label: '予約管理' },
        { key: 'users', label: 'ユーザー管理' },
    ]

    const card: any = { background: 'white', borderRadius: 16, border: '1px solid #DBDBDB', padding: 24, marginBottom: 16 }

    return (
        <div style={{ minHeight: '100vh', background: '#FAFAFA' }}>
            {/* Header */}
            <header className="sp-header" style={{ background: 'white', borderBottom: '1px solid #DBDBDB', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Link href="/" style={{ fontSize: 20, fontWeight: 700, textDecoration: 'none', ...gradText }}>Salon de Beauty</Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 12, color: '#737373' }}>{user?.email}</span>
                    <button onClick={() => router.push('/')} style={{ fontSize: 12, border: '1.5px solid #DBDBDB', background: 'none', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', color: '#262626' }}>トップへ</button>
                    <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }} style={{ background: grad, color: 'white', border: 'none', padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>ログアウト</button>
                </div>
            </header>

            {/* Tabs */}
            <div className="sp-dashboard-tabs" style={{ background: 'white', borderBottom: '1px solid #DBDBDB', padding: '0 32px', display: 'flex' }}>
                {tabList.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key as any)}
                        style={{ padding: '12px 20px', fontSize: 12, fontWeight: 700, border: 'none', borderBottom: tab === t.key ? '2px solid #E1306C' : '2px solid transparent', background: 'none', cursor: 'pointer', color: tab === t.key ? '#111' : '#737373', fontFamily: 'inherit', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="sp-dashboard-main" style={{ maxWidth: 720, margin: '0 auto', padding: '24px 32px' }}>

                {/* SALON INFO TAB */}
                {tab === 'salon' && (
                    <div>
                        {salon && (
                            <div style={card}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#737373', letterSpacing: '0.08em', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #DBDBDB' }}>サロン画像</div>
                                <div style={{ marginBottom: 16 }}>
                                    <label style={labelStyle}>トップ画像（1枚）</label>
                                    {salon.top_image && <img src={salon.top_image} alt="" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 10, marginBottom: 8 }} />}
                                    <button onClick={() => topImageRef.current?.click()} disabled={uploading}
                                        style={{ width: '100%', border: '1.5px dashed #DBDBDB', background: '#FAFAFA', borderRadius: 10, padding: '12px', fontSize: 12, fontWeight: 700, color: '#737373', cursor: 'pointer', fontFamily: 'inherit' }}>
                                        {uploading ? 'アップロード中...' : salon.top_image ? '変更する' : '+ トップ画像を追加'}
                                    </button>
                                    <input ref={topImageRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleTopImageUpload} />
                                </div>
                                <div>
                                    <label style={labelStyle}>店内・サロン画像（複数可）</label>
                                    {(salon.gallery_images || []).length > 0 && (
                                        <div className="sp-photo-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 8 }}>
                                            {(salon.gallery_images || []).map((url: string, i: number) => (
                                                <div key={i} style={{ position: 'relative' }}>
                                                    <img src={url} alt="" style={{ width: '100%', height: 96, objectFit: 'cover', borderRadius: 8 }} />
                                                    <button onClick={() => deleteGalleryImage(url)} style={{ position: 'absolute', top: 4, right: 4, background: '#EF5350', color: 'white', border: 'none', width: 20, height: 20, borderRadius: '50%', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <button onClick={() => galleryRef.current?.click()} disabled={uploading}
                                        style={{ width: '100%', border: '1.5px dashed #DBDBDB', background: '#FAFAFA', borderRadius: 10, padding: '12px', fontSize: 12, fontWeight: 700, color: '#737373', cursor: 'pointer', fontFamily: 'inherit' }}>
                                        {uploading ? 'アップロード中...' : '+ 画像を追加（複数可）'}
                                    </button>
                                    <input ref={galleryRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleGalleryUpload} />
                                </div>
                            </div>
                        )}

                        <div style={card}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#737373', letterSpacing: '0.08em', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #DBDBDB' }}>サロン情報の{salon ? '編集' : '登録'}</div>

                            <div style={{ marginBottom: 14 }}>
                                <label style={labelStyle}>サロン名 *</label>
                                <input value={salonForm.name} onChange={e => setSalonForm({ ...salonForm, name: e.target.value })} placeholder="例：SALON de BEAUTÉ" style={inputStyle} />
                            </div>
                            <div style={{ marginBottom: 14 }}>
                                <label style={labelStyle}>大カテゴリ *</label>
                                <select value={salonForm.genre} onChange={e => setSalonForm({ ...salonForm, genre: e.target.value, sub_genre: '' })} style={{ ...inputStyle }}>
                                    {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                            <div style={{ marginBottom: 14 }}>
                                <label style={labelStyle}>小ジャンル（サービス内容）</label>
                                <select value={salonForm.sub_genre} onChange={e => setSalonForm({ ...salonForm, sub_genre: e.target.value })} style={{ ...inputStyle }}>
                                    <option value=''>選択してください（任意）</option>
                                    {getGenresByCategory(salonForm.genre).map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                                <div style={{ fontSize: 11, color: '#737373', marginTop: 4 }}>検索・一覧ページで絞り込みに使われます</div>
                            </div>
                            <div style={{ marginBottom: 14 }}>
                                <label style={labelStyle}>都道府県 *</label>
                                <select value={salonForm.prefecture}
                                    onChange={e => { const p = e.target.value; const areas = getAreasForPref(p); setSalonForm({ ...salonForm, prefecture: p, area: areas[0] || '' }) }}
                                    style={{ ...inputStyle }}>
                                    {Object.entries(REGIONS).map(([region, prefs]) => (
                                        <optgroup key={region} label={region}>
                                            {Object.keys(prefs).map(p => <option key={p} value={p}>{p}</option>)}
                                        </optgroup>
                                    ))}
                                </select>
                            </div>
                            <div style={{ marginBottom: 14 }}>
                                <label style={labelStyle}>エリア *</label>
                                <select value={salonForm.area} onChange={e => setSalonForm({ ...salonForm, area: e.target.value })} style={{ ...inputStyle }}>
                                    {getAreasForPref(salonForm.prefecture).map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                            </div>
                            {[
                                { key: 'address', label: '住所 *', placeholder: '東京都渋谷区渋谷1-1-1' },
                                { key: 'nearest_station', label: '最寄り駅', placeholder: '渋谷駅' },
                                { key: 'phone', label: '電話番号', placeholder: '03-xxxx-xxxx' },
                            ].map(f => (
                                <div key={f.key} style={{ marginBottom: 14 }}>
                                    <label style={labelStyle}>{f.label}</label>
                                    <input value={(salonForm as any)[f.key]} onChange={e => setSalonForm({ ...salonForm, [f.key]: e.target.value })} placeholder={f.placeholder} style={inputStyle} />
                                </div>
                            ))}
                            <div style={{ marginBottom: 14 }}>
                                <label style={labelStyle}>説明文</label>
                                <textarea value={salonForm.description} onChange={e => setSalonForm({ ...salonForm, description: e.target.value })}
                                    placeholder="サロンの特徴・アピールポイント..."
                                    style={{ ...inputStyle, height: 90, resize: 'none' as any }} />
                            </div>
                            <div style={{ marginBottom: 20 }}>
                                <label style={labelStyle}>予約スロット間隔</label>
                                <select value={salonForm.slot_interval} onChange={e => setSalonForm({ ...salonForm, slot_interval: parseInt(e.target.value) })} style={{ ...inputStyle }}>
                                    <option value={15}>15分間隔</option>
                                    <option value={30}>30分間隔</option>
                                    <option value={60}>60分間隔</option>
                                </select>
                            </div>
                            <div style={{ marginBottom: 20, paddingTop: 20, borderTop: '1px solid #DBDBDB' }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#737373', letterSpacing: '0.08em', marginBottom: 14 }}>振込口座情報</div>
                                <div style={{ background: '#FFF8E1', border: '1px solid #FFE082', borderRadius: 10, padding: '12px 14px', marginBottom: 14, fontSize: 12, color: '#7A5800', lineHeight: 2.0 }}>
                                    事前決済を利用する場合に必要です。<br />
                                    売上から手数料5%を引いた金額が振り込まれます。<br />
                                    <span style={{ fontWeight: 700 }}>月末締め・翌月末振込</span>（土日祝の場合は営業日前倒し）<br />
                                    振込手数料：別途330円（税込）
                                </div>
                                <div style={{ marginBottom: 10 }}>
                                    <input value={salonForm.bank_name} onChange={e => setSalonForm({ ...salonForm, bank_name: e.target.value })} placeholder="銀行名（例：三菱UFJ銀行）" style={inputStyle} />
                                </div>
                                <div style={{ marginBottom: 10 }}>
                                    <input value={salonForm.bank_branch} onChange={e => setSalonForm({ ...salonForm, bank_branch: e.target.value })} placeholder="支店名（例：渋谷支店）" style={inputStyle} />
                                </div>
                                <div style={{ marginBottom: 10 }}>
                                    <select value={salonForm.bank_account_type} onChange={e => setSalonForm({ ...salonForm, bank_account_type: e.target.value })} style={{ ...inputStyle }}>
                                        <option value="savings">普通</option>
                                        <option value="checking">当座</option>
                                    </select>
                                </div>
                                <div style={{ marginBottom: 10 }}>
                                    <input value={salonForm.bank_account_number} onChange={e => setSalonForm({ ...salonForm, bank_account_number: e.target.value })} placeholder="口座番号（例：1234567）" style={inputStyle} />
                                </div>
                                <div style={{ marginBottom: 10 }}>
                                    <input value={salonForm.bank_account_name} onChange={e => setSalonForm({ ...salonForm, bank_account_name: e.target.value })} placeholder="口座名義（カタカナ）" style={inputStyle} />
                                </div>
                            </div>
                            <button onClick={saveSalon} disabled={saving}
                                style={{ width: '100%', background: grad, color: 'white', border: 'none', padding: 13, borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}>
                                {saving ? '保存中...' : salon ? '更新する' : '登録する'}
                            </button>
                        </div>
                    </div>
                )}
                {/* 退会セクション（サロン情報タブ内） */}
                {tab === 'salon' && (
                    <div style={{ marginTop: 8, borderTop: '1px solid #DBDBDB', paddingTop: 24 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#737373', marginBottom: 8 }}>アカウント</div>
                        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #DBDBDB', padding: '20px 24px' }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#262626', marginBottom: 6 }}>退会する</div>
                            <div style={{ fontSize: 12, color: '#737373', lineHeight: 1.8, marginBottom: 16 }}>
                                退会してもサロン情報・予約データは保持されます。<br />
                                退会後は同じメールアドレスで再登録が可能です。
                            </div>
                            <button
                                onClick={handleWithdraw}
                                disabled={withdrawing}
                                style={{ fontSize: 12, color: '#C62828', border: '1.5px solid #FFCDD2', background: '#FFEBEE', padding: '8px 20px', borderRadius: 8, cursor: withdrawing ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontWeight: 700, opacity: withdrawing ? 0.6 : 1 }}>
                                {withdrawing ? '処理中...' : '退会する'}
                            </button>
                        </div>
                    </div>
                )}

                {/* MENUS TAB */}
                {tab === 'menus' && (
                    <div>
                        <div style={card}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#737373', letterSpacing: '0.08em', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #DBDBDB' }}>メニューを追加</div>
                            <div style={{ marginBottom: 10 }}>
                                <input value={menuForm.name} onChange={e => setMenuForm({ ...menuForm, name: e.target.value })} placeholder="メニュー名 *" style={inputStyle} />
                            </div>
                            <div style={{ marginBottom: 10 }}>
                                <textarea value={menuForm.description} onChange={e => setMenuForm({ ...menuForm, description: e.target.value })}
                                    placeholder="メニューの説明（任意）"
                                    style={{ ...inputStyle, height: 64, resize: 'none' as any }} />
                            </div>
                            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ ...labelStyle, marginBottom: 4 }}>料金（円）*</label>
                                    <input value={menuForm.price} onChange={e => setMenuForm({ ...menuForm, price: e.target.value })} placeholder="5000" type="number" style={inputStyle} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ ...labelStyle, marginBottom: 4 }}>所要時間（分）*</label>
                                    <input value={menuForm.duration} onChange={e => setMenuForm({ ...menuForm, duration: e.target.value })} placeholder="60" type="number" style={inputStyle} />
                                </div>
                            </div>
                            <button onClick={addMenu} style={{ width: '100%', background: grad, color: 'white', border: 'none', padding: 11, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>+ 追加する</button>
                        </div>

                        <div style={card}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#737373', letterSpacing: '0.08em', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #DBDBDB' }}>登録済みメニュー（{menus.length}件）</div>
                            {menus.length === 0 ? <div style={{ textAlign: 'center', color: '#737373', padding: '20px 0', fontSize: 13 }}>メニューがまだありません</div>
                                : menus.map(menu => (
                                    <div key={menu.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid #DBDBDB' }}>
                                        <div style={{ display: 'flex', gap: 10, flex: 1 }}>
                                            {menu.image_url && (
                                                <img src={menu.image_url} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                                            )}
                                            <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 14, fontWeight: 700 }}>{menu.name}</div>
                                            {menu.description && <div style={{ fontSize: 11, color: '#737373', marginTop: 2, lineHeight: 1.5 }}>{menu.description}</div>}
                                            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4, ...gradText }}>¥{menu.price.toLocaleString()}&nbsp;&nbsp;<span style={{ fontSize: 11, color: '#737373', background: 'none', WebkitTextFillColor: '#737373' }}>{menu.duration}分</span></div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 12, alignItems: 'center' }}>
                                            <label style={{ fontSize: 11, fontWeight: 700, border: '1.5px solid #DBDBDB', background: '#FAFAFA', color: '#262626', padding: '4px 10px', borderRadius: 8, cursor: 'pointer' }}>
                                                {menu.image_url ? '写真変更' : '写真追加'}
                                                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadMenuImage(f, menu.id) }} />
                                            </label>
                                            <button onClick={() => deleteMenu(menu.id)} style={{ fontSize: 11, fontWeight: 700, border: '1.5px solid #FFCDD2', background: '#FFEBEE', color: '#C62828', padding: '4px 10px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>削除</button>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}

                {/* STYLISTS TAB */}
                {tab === 'stylists' && (
                    <div>
                        <div style={card}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#737373', letterSpacing: '0.08em', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #DBDBDB' }}>スタイリストを追加</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                                <div style={{ width: 64, height: 64, borderRadius: '50%', background: stylistImagePreview ? 'none' : 'linear-gradient(135deg,#FBE0EC,#EED9F7)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                                    {stylistImagePreview ? <img src={stylistImagePreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 24, fontWeight: 700, ...gradText }}>S</span>}
                                </div>
                                <button onClick={() => document.getElementById('stylist-img-input')?.click()}
                                    style={{ fontSize: 12, fontWeight: 700, border: '1.5px solid #DBDBDB', background: 'none', padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', color: '#262626' }}>
                                    写真を選択
                                </button>
                                <input id="stylist-img-input" type="file" accept="image/*" style={{ display: 'none' }}
                                    onChange={e => { const f = e.target.files?.[0]; if (f) { setStylistImageFile(f); setStylistImagePreview(URL.createObjectURL(f)) } }} />
                            </div>
                            {[
                                { key: 'name', placeholder: '名前 *' },
                                { key: 'role', placeholder: '役職（例：トップスタイリスト）' },
                                { key: 'experience_years', placeholder: '経験年数', type: 'number' },
                                { key: 'instagram', placeholder: 'Instagram ID（@なし）' },
                            ].map(f => (
                                <div key={f.key} style={{ marginBottom: 10 }}>
                                    <input value={(stylistForm as any)[f.key]} onChange={e => setStylistForm({ ...stylistForm, [f.key]: e.target.value })}
                                        placeholder={f.placeholder} type={f.type || 'text'} style={inputStyle} />
                                </div>
                            ))}
                            <textarea value={stylistForm.description} onChange={e => setStylistForm({ ...stylistForm, description: e.target.value })}
                                placeholder="自己紹介・得意なスタイルなど"
                                style={{ ...inputStyle, height: 72, resize: 'none' as any, marginBottom: 14 }} />
                            <button onClick={addStylist} disabled={uploading}
                                style={{ width: '100%', background: grad, color: 'white', border: 'none', padding: 11, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: uploading ? 0.6 : 1 }}>
                                {uploading ? 'アップロード中...' : '+ 追加する'}
                            </button>
                        </div>

                        <div style={card}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#737373', letterSpacing: '0.08em', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #DBDBDB' }}>登録済みスタイリスト（{stylists.length}人）</div>
                            {stylists.length === 0 ? <div style={{ textAlign: 'center', color: '#737373', padding: '20px 0', fontSize: 13 }}>スタイリストがまだいません</div>
                                : stylists.map(s => (
                                    <div key={s.id} style={{ border: '1px solid #DBDBDB', borderRadius: 12, marginBottom: 12, overflow: 'hidden' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#FBE0EC,#EED9F7)', overflow: 'hidden', flexShrink: 0 }}>
                                                    {s.image_url ? <img src={s.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, ...gradText }}>{s.name?.[0]}</div>}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 14, fontWeight: 700 }}>{s.name}</div>
                                                    {s.role && <div style={{ fontSize: 11, fontWeight: 700, ...gradText }}>{s.role}</div>}
                                                    {s.experience_years && <div style={{ fontSize: 11, color: '#737373' }}>経験{s.experience_years}年</div>}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button onClick={() => editingScheduleStylistId === s.id ? setEditingScheduleStylistId(null) : openScheduleEditor(s.id)}
                                                    style={{ fontSize: 11, fontWeight: 700, border: '1.5px solid #DBDBDB', background: 'none', padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', color: '#262626' }}>
                                                    {editingScheduleStylistId === s.id ? '閉じる' : 'スケジュール'}
                                                </button>
                                                <button onClick={() => deleteStylist(s.id)} style={{ fontSize: 11, fontWeight: 700, border: '1.5px solid #FFCDD2', background: '#FFEBEE', color: '#C62828', padding: '5px 10px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>削除</button>
                                            </div>
                                        </div>

                                        {editingScheduleStylistId === s.id && (
                                            <div style={{ borderTop: '1px solid #DBDBDB', background: '#FAFAFA', padding: '16px' }}>
                                                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>稼働スケジュール設定</div>
                                                {scheduleForm.map((sch, i) => (
                                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid #DBDBDB' }}>
                                                        <span style={{ width: 20, fontSize: 11, fontWeight: 700, textAlign: 'center', color: i === 0 ? '#E1306C' : i === 6 ? '#5851DB' : '#737373' }}>{DAY_NAMES[sch.day_of_week]}</span>
                                                        <button onClick={() => { const u = [...scheduleForm]; u[i] = { ...u[i], is_day_off: !u[i].is_day_off }; setScheduleForm(u) }}
                                                            style={{ padding: '4px 12px', borderRadius: 100, border: 'none', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', background: sch.is_day_off ? '#F2F2F2' : '#E8F5E9', color: sch.is_day_off ? '#737373' : '#388E3C' }}>
                                                            {sch.is_day_off ? '休み' : '稼働'}
                                                        </button>
                                                        {!sch.is_day_off && (
                                                            <>
                                                                <input type="time" value={sch.start_time} onChange={e => { const u = [...scheduleForm]; u[i] = { ...u[i], start_time: e.target.value }; setScheduleForm(u) }}
                                                                    style={{ border: '1.5px solid #DBDBDB', borderRadius: 8, padding: '4px 8px', fontSize: 11, fontFamily: 'inherit', flex: 1 }} />
                                                                <span style={{ fontSize: 11, color: '#737373' }}>〜</span>
                                                                <input type="time" value={sch.end_time} onChange={e => { const u = [...scheduleForm]; u[i] = { ...u[i], end_time: e.target.value }; setScheduleForm(u) }}
                                                                    style={{ border: '1.5px solid #DBDBDB', borderRadius: 8, padding: '4px 8px', fontSize: 11, fontFamily: 'inherit', flex: 1 }} />
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                                    <button onClick={saveSchedule} disabled={scheduleSaving}
                                                        style={{ flex: 1, background: grad, color: 'white', border: 'none', padding: 10, borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: scheduleSaving ? 0.6 : 1 }}>
                                                        {scheduleSaving ? '保存中...' : '保存する'}
                                                    </button>
                                                    <button onClick={() => setEditingScheduleStylistId(null)}
                                                        style={{ flex: 1, border: '1.5px solid #DBDBDB', background: 'none', padding: 10, borderRadius: 10, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', color: '#737373' }}>
                                                        キャンセル
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                        </div>
                    </div>
                )}

                {/* STATS TAB */}
                {tab === 'stats' && (() => {
                    // 過去6ヶ月のデータ集計
                    const now = new Date()
                    const months = Array.from({ length: 6 }, (_, i) => {
                        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
                        return { year: d.getFullYear(), month: d.getMonth() + 1, label: `${d.getMonth() + 1}月` }
                    })

                    const completedRes = reservations.filter((r: any) => r.status === 'completed' && r.completed_at)

                    const monthlyData = months.map(m => {
                        const filtered = completedRes.filter((r: any) => {
                            const d = new Date(r.completed_at)
                            return d.getFullYear() === m.year && d.getMonth() + 1 === m.month
                        })
                        return {
                            label: m.label,
                            count: filtered.length,
                            sales: filtered.reduce((sum: number, r: any) => sum + (r.menus?.price || 0), 0),
                        }
                    })

                    const maxSales = Math.max(...monthlyData.map(d => d.sales), 1)
                    const maxCount = Math.max(...monthlyData.map(d => d.count), 1)
                    const totalSales = completedRes.reduce((sum: number, r: any) => sum + (r.menus?.price || 0), 0)
                    const totalCount = completedRes.length
                    const thisMonth = monthlyData[5]
                    const lastMonth = monthlyData[4]
                    const salesDiff = thisMonth.sales - lastMonth.sales
                    const countDiff = thisMonth.count - lastMonth.count

                    const BAR_W = 32
                    const CHART_H = 120
                    const GAP = 12
                    const CHART_W = (BAR_W + GAP) * 6 - GAP

                    return (
                        <div>
                            {/* サマリーカード */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
                                {[
                                    { label: '今月の売上', value: `¥${thisMonth.sales.toLocaleString()}`, diff: salesDiff, unit: '円' },
                                    { label: '今月の来店数', value: `${thisMonth.count}件`, diff: countDiff, unit: '件' },
                                    { label: '累計売上', value: `¥${totalSales.toLocaleString()}`, sub: `累計${totalCount}件` },
                                ].map(s => (
                                    <div key={s.label} style={card}>
                                        <div style={{ fontSize: 11, color: '#737373', marginBottom: 6 }}>{s.label}</div>
                                        <div style={{ fontSize: 20, fontWeight: 700, background: 'linear-gradient(45deg,#F77737,#E1306C,#833AB4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{s.value}</div>
                                        {s.diff !== undefined && (
                                            <div style={{ fontSize: 11, marginTop: 4, color: s.diff >= 0 ? '#2E7D32' : '#C62828', fontWeight: 700 }}>
                                                {s.diff >= 0 ? '↑' : '↓'} 先月比 {Math.abs(s.diff).toLocaleString()}{s.unit}
                                            </div>
                                        )}
                                        {s.sub && <div style={{ fontSize: 11, color: '#737373', marginTop: 4 }}>{s.sub}</div>}
                                    </div>
                                ))}
                            </div>

                            {/* 売上グラフ */}
                            <div style={card}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#737373', letterSpacing: '0.08em', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #DBDBDB' }}>月別売上（過去6ヶ月）</div>
                                <div style={{ overflowX: 'auto' }}>
                                    <svg width={CHART_W} height={CHART_H + 40} style={{ display: 'block', minWidth: CHART_W }}>
                                        {monthlyData.map((d, i) => {
                                            const barH = maxSales > 0 ? Math.max((d.sales / maxSales) * CHART_H, d.sales > 0 ? 4 : 0) : 0
                                            const x = i * (BAR_W + GAP)
                                            const y = CHART_H - barH
                                            return (
                                                <g key={i}>
                                                    <defs>
                                                        <linearGradient id={`g${i}`} x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="0%" stopColor="#F77737" />
                                                            <stop offset="100%" stopColor="#833AB4" />
                                                        </linearGradient>
                                                    </defs>
                                                    <rect x={x} y={y} width={BAR_W} height={barH} rx={4} fill={`url(#g${i})`} opacity={i === 5 ? 1 : 0.5} />
                                                    <text x={x + BAR_W / 2} y={CHART_H + 16} textAnchor="middle" fontSize={10} fill="#737373">{d.label}</text>
                                                    {d.sales > 0 && <text x={x + BAR_W / 2} y={y - 4} textAnchor="middle" fontSize={9} fill="#555">¥{(d.sales / 1000).toFixed(0)}k</text>}
                                                </g>
                                            )
                                        })}
                                    </svg>
                                </div>
                            </div>

                            {/* 来店数グラフ */}
                            <div style={card}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#737373', letterSpacing: '0.08em', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #DBDBDB' }}>月別来店数（過去6ヶ月）</div>
                                <div style={{ overflowX: 'auto' }}>
                                    <svg width={CHART_W} height={CHART_H + 40} style={{ display: 'block', minWidth: CHART_W }}>
                                        {monthlyData.map((d, i) => {
                                            const barH = maxCount > 0 ? Math.max((d.count / maxCount) * CHART_H, d.count > 0 ? 4 : 0) : 0
                                            const x = i * (BAR_W + GAP)
                                            const y = CHART_H - barH
                                            return (
                                                <g key={i}>
                                                    <defs>
                                                        <linearGradient id={`gc${i}`} x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="0%" stopColor="#5851DB" />
                                                            <stop offset="100%" stopColor="#E1306C" />
                                                        </linearGradient>
                                                    </defs>
                                                    <rect x={x} y={y} width={BAR_W} height={barH} rx={4} fill={`url(#gc${i})`} opacity={i === 5 ? 1 : 0.5} />
                                                    <text x={x + BAR_W / 2} y={CHART_H + 16} textAnchor="middle" fontSize={10} fill="#737373">{d.label}</text>
                                                    {d.count > 0 && <text x={x + BAR_W / 2} y={y - 4} textAnchor="middle" fontSize={9} fill="#555">{d.count}件</text>}
                                                </g>
                                            )
                                        })}
                                    </svg>
                                </div>
                            </div>

                            {/* メニュー別売上ランキング */}
                            <div style={card}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#737373', letterSpacing: '0.08em', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #DBDBDB' }}>メニュー別売上ランキング</div>
                                {(() => {
                                    const menuMap: Record<string, { name: string, count: number, sales: number }> = {}
                                    completedRes.forEach((r: any) => {
                                        const name = r.menus?.name || '不明'
                                        if (!menuMap[name]) menuMap[name] = { name, count: 0, sales: 0 }
                                        menuMap[name].count++
                                        menuMap[name].sales += r.menus?.price || 0
                                    })
                                    const ranked = Object.values(menuMap).sort((a, b) => b.sales - a.sales).slice(0, 5)
                                    const maxMenuSales = Math.max(...ranked.map(r => r.sales), 1)
                                    if (ranked.length === 0) return <div style={{ textAlign: 'center', color: '#737373', padding: '20px 0', fontSize: 13 }}>データがありません</div>
                                    return ranked.map((m, i) => (
                                        <div key={m.name} style={{ marginBottom: 12 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                <div style={{ fontSize: 12, fontWeight: 700, color: '#111', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: i === 0 ? 'linear-gradient(45deg,#F77737,#E1306C)' : '#DBDBDB', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: i === 0 ? 'white' : '#737373', flexShrink: 0 }}>{i + 1}</span>
                                                    {m.name}
                                                </div>
                                                <div style={{ fontSize: 12, color: '#737373', flexShrink: 0 }}>¥{m.sales.toLocaleString()} / {m.count}件</div>
                                            </div>
                                            <div style={{ height: 6, background: '#F2F2F2', borderRadius: 100, overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${(m.sales / maxMenuSales) * 100}%`, background: 'linear-gradient(45deg,#F77737,#E1306C,#833AB4)', borderRadius: 100 }} />
                                            </div>
                                        </div>
                                    ))
                                })()}
                            </div>
                        </div>
                    )
                })()}

                {/* RESERVATIONS TAB */}
                {tab === 'reservations' && (
                    <div style={card}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #DBDBDB' }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#737373', letterSpacing: '0.08em' }}>予約一覧（{reservations.length}件）</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <select
                                        value={csvMonth}
                                        onChange={e => setCsvMonth(e.target.value)}
                                        style={{ border: '1.5px solid #DBDBDB', borderRadius: 8, padding: '5px 10px', fontSize: 12, fontFamily: 'inherit', outline: 'none', color: '#111', background: '#FAFAFA', cursor: 'pointer' }}
                                    >
                                        {Array.from({ length: 13 }, (_, i) => {
                                            const d = new Date()
                                            d.setDate(1)
                                            d.setMonth(d.getMonth() - i)
                                            const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                                            const label = `${d.getFullYear()}年${d.getMonth() + 1}月`
                                            return <option key={val} value={val}>{label}</option>
                                        })}
                                    </select>
                                    <button onClick={downloadCSV}
                                        style={{ fontSize: 11, fontWeight: 700, border: '1.5px solid #DBDBDB', background: '#FAFAFA', color: '#262626', padding: '5px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}>
                                        売上明細CSV
                                    </button>
                                </div>
                            </div>
                        {reservations.length === 0 ? <div style={{ textAlign: 'center', color: '#737373', padding: '20px 0', fontSize: 13 }}>予約がまだありません</div>
                            : reservations.map(res => (

                                <div key={res.id} style={{ padding: '14px 0', borderBottom: '1px solid #DBDBDB' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: statusConfig[res.status]?.bg, color: statusConfig[res.status]?.color }}>
                                            {statusConfig[res.status]?.label}
                                        </span>
                                        <span style={{ fontSize: 11, color: '#737373' }}>{new Date(res.reserved_at).toLocaleString('ja-JP')}</span>
                                    </div>
                                    <div style={{ fontSize: 14, fontWeight: 700 }}>{res.menus?.name}</div>
                                    <div style={{ fontSize: 12, fontWeight: 700, ...gradText }}>¥{res.menus?.price?.toLocaleString()}</div>
                                    {res.stylists?.name && <div style={{ fontSize: 11, color: '#737373' }}>担当：{res.stylists.name}</div>}
                                    {(() => {
                                        const isBlocked = blocks.some(b => b.blocked_id === res.user_id)
                                        return (
                                            <div style={{ marginTop: 8 }}>
                                                {isBlocked ? (
                                                    <button onClick={() => unblockUser(res.user_id)}
                                                        style={{ fontSize: 11, fontWeight: 700, border: '1.5px solid #DBDBDB', background: '#F2F2F2', color: '#737373', padding: '4px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
                                                        ブロック済み（解除する）
                                                    </button>
                                                ) : (
                                                    <button onClick={() => blockUser(res.user_id, salon.id)}
                                                        style={{ fontSize: 11, fontWeight: 700, border: '1.5px solid #FFCDD2', background: '#FFEBEE', color: '#C62828', padding: '4px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
                                                        このユーザーをブロック
                                                    </button>
                                                )}
                                            </div>
                                        )
                                    })()}
                                    {res.status === 'pending' && (
                                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                            <button onClick={() => updateReservationStatus(res.id, 'confirmed')}
                                                style={{ flex: 1, background: '#E8F5E9', color: '#388E3C', border: '1.5px solid #A5D6A7', padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                                                承認する
                                            </button>
                                            <button onClick={() => updateReservationStatus(res.id, 'cancelled')}
                                                style={{ flex: 1, background: '#FFEBEE', color: '#C62828', border: '1.5px solid #FFCDD2', padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                                                キャンセル
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                    </div>
                )}
                {/* PHOTOS TAB */}
                {tab === 'photos' && (
                    <div>
                        {/* サロンスタイル写真 */}
                        <div style={card}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#737373', letterSpacing: '0.08em', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #DBDBDB' }}>
                                サロン・スタイル写真
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                                {[{ key: 'style', label: 'スタイル写真' }, { key: 'interior', label: '店内・雰囲気' }, { key: 'other', label: 'その他' }].map(cat => (
                                    <label key={cat.key} style={{ fontSize: 12, fontWeight: 700, background: grad, color: 'white', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', flexShrink: 0 }}>
                                        + {cat.label}を追加
                                        <input type="file" accept="image/*" multiple style={{ display: 'none' }}
                                            onChange={async e => {
                                                const files = Array.from(e.target.files || [])
                                                for (const f of files) await uploadSalonPhoto(f, cat.key)
                                            }} />
                                    </label>
                                ))}
                            </div>
                            {salonPhotos.length === 0 ? (
                                <div style={{ textAlign: 'center', color: '#737373', padding: '24px 0', fontSize: 13 }}>写真がまだありません</div>
                            ) : (
                                <div>
                                    {['style', 'interior', 'other'].map(cat => {
                                        const photos = salonPhotos.filter(p => p.category === cat)
                                        if (photos.length === 0) return null
                                        const catLabel: any = { style: 'スタイル写真', interior: '店内・雰囲気', other: 'その他' }
                                        return (
                                            <div key={cat} style={{ marginBottom: 20 }}>
                                                <div style={{ fontSize: 11, fontWeight: 700, color: '#737373', marginBottom: 10 }}>{catLabel[cat]}</div>
                                                <div className="sp-4col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                                                    {photos.map(photo => (
                                                        <div key={photo.id} style={{ position: 'relative' }}>
                                                            <img src={photo.image_url} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8 }} />
                                                            <button onClick={() => deleteSalonPhoto(photo.id)}
                                                                style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', width: 22, height: 22, borderRadius: '50%', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                            {photoUploading && <div style={{ textAlign: 'center', color: '#737373', fontSize: 12, marginTop: 8 }}>アップロード中...</div>}
                        </div>

                        {/* スタイリスト作品集 */}
                        <div style={card}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#737373', letterSpacing: '0.08em', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #DBDBDB' }}>
                                スタイリスト作品集
                            </div>
                            {stylists.length === 0 ? (
                                <div style={{ textAlign: 'center', color: '#737373', fontSize: 13, padding: '20px 0' }}>スタイリストを先に登録してください</div>
                            ) : stylists.map(s => (
                                <div key={s.id} style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid #DBDBDB' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#FBE0EC,#EED9F7)', overflow: 'hidden', flexShrink: 0 }}>
                                            {s.image_url ? <img src={s.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, ...gradText }}>{s.name?.[0]}</div>}
                                        </div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{s.name}</div>
                                        <label style={{ fontSize: 11, fontWeight: 700, background: 'none', border: '1.5px solid #DBDBDB', color: '#262626', padding: '4px 12px', borderRadius: 8, cursor: 'pointer', marginLeft: 'auto' }}>
                                            + 写真追加
                                            <input type="file" accept="image/*" multiple style={{ display: 'none' }}
                                                onChange={async e => {
                                                    const files = Array.from(e.target.files || [])
                                                    for (const f of files) await uploadStylistPhoto(f, s.id)
                                                }} />
                                        </label>
                                    </div>
                                    <div className="sp-4col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                                        {stylistPhotos.filter(p => p.stylist_id === s.id).map(photo => (
                                            <div key={photo.id} style={{ position: 'relative' }}>
                                                <img src={photo.image_url} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8 }} />
                                                <button onClick={() => deleteStylistPhoto(photo.id)}
                                                    style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', width: 22, height: 22, borderRadius: '50%', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                                            </div>
                                        ))}
                                        {stylistPhotos.filter(p => p.stylist_id === s.id).length === 0 && (
                                            <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#737373', fontSize: 12, padding: '12px 0' }}>まだ写真がありません</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* USERS TAB */}
                {tab === 'users' && (
                    <div style={card}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#737373', letterSpacing: '0.08em', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #DBDBDB' }}>
                            利用ユーザー一覧（{salonUsers.length}人）
                        </div>

                        {salonUsers.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#737373', padding: '32px 0', fontSize: 13 }}>
                                予約履歴のあるユーザーはいません
                            </div>
                        ) : salonUsers.map(u => {
                            const isBlocked = blocks.some(b => b.blocked_id === u.user_id)
                            const totalAmount = u.reservations
                                .filter((r: any) => r.status === 'completed')
                                .reduce((sum: number, r: any) => sum + (r.menus?.price || 0), 0)
                            const lastReservation = u.reservations
                                .sort((a: any, b: any) => new Date(b.reserved_at).getTime() - new Date(a.reserved_at).getTime())[0]
                            const completedCount = u.reservations.filter((r: any) => r.status === 'completed').length

                            return (
                                <div key={u.user_id} style={{ padding: '16px 0', borderBottom: '1px solid #DBDBDB' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ flex: 1 }}>
                                            {/* 氏名 */}
                                            {u.full_name && (
                                                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>
                                                    {u.full_name}
                                                </div>
                                            )}
                                            {/* 電話番号 */}
                                            {u.phone && (
                                                <div style={{ fontSize: 12, color: '#737373', marginBottom: 4 }}>
                                                    {u.phone}
                                                </div>
                                            )}
                                            {/* メールアドレス */}
                                            <div style={{ fontSize: u.full_name ? 12 : 14, fontWeight: u.full_name ? 400 : 700, color: u.full_name ? '#737373' : '#111', marginBottom: 6 }}>
                                                {u.email || u.user_id}
                                            </div>

                                            {/* 統計 */}
                                            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                                <div style={{ fontSize: 11, color: '#737373' }}>
                                                    予約回数：<span style={{ fontWeight: 700, color: '#111' }}>{u.reservations.length}回</span>
                                                </div>
                                                <div style={{ fontSize: 11, color: '#737373' }}>
                                                    来店完了：<span style={{ fontWeight: 700, color: '#111' }}>{completedCount}回</span>
                                                </div>
                                                {totalAmount > 0 && (
                                                    <div style={{ fontSize: 11, color: '#737373' }}>
                                                        累計金額：<span style={{ fontWeight: 700, background: 'linear-gradient(45deg,#F77737,#E1306C,#833AB4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>¥{totalAmount.toLocaleString()}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* 最終予約日 */}
                                            {lastReservation && (
                                                <div style={{ fontSize: 11, color: '#737373', marginTop: 4 }}>
                                                    最終予約：{new Date(lastReservation.reserved_at).toLocaleDateString('ja-JP')}
                                                    {lastReservation.menus?.name}
                                                </div>
                                            )}

                                            {/* ブロック状態 */}
                                            {isBlocked && (
                                                <div style={{ marginTop: 6, display: 'inline-block', fontSize: 10, fontWeight: 700, background: '#FFEBEE', color: '#C62828', padding: '2px 10px', borderRadius: 100 }}>
                                                    ブロック中
                                                </div>
                                            )}
                                        </div>

                                        {/* ブロック／解除ボタン */}
                                        <div style={{ flexShrink: 0, marginLeft: 12 }}>
                                            {isBlocked ? (
                                                <button onClick={() => unblockUser(u.user_id)}
                                                    style={{ fontSize: 11, fontWeight: 700, border: '1.5px solid #DBDBDB', background: '#F2F2F2', color: '#737373', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
                                                    ブロック解除
                                                </button>
                                            ) : (
                                                <button onClick={() => blockUser(u.user_id, salon.id)}
                                                    style={{ fontSize: 11, fontWeight: 700, border: '1.5px solid #FFCDD2', background: '#FFEBEE', color: '#C62828', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
                                                    ブロック
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* 予約履歴の折りたたみ */}
                                    <details style={{ marginTop: 10 }}>
                                        <summary style={{ fontSize: 11, color: '#833AB4', cursor: 'pointer', fontWeight: 700, listStyle: 'none' }}>
                                            予約履歴を見る ({u.reservations.length}件)
                                        </summary>
                                        <div style={{ marginTop: 8, paddingLeft: 8 }}>
                                            {u.reservations
                                                .sort((a: any, b: any) => new Date(b.reserved_at).getTime() - new Date(a.reserved_at).getTime())
                                                .map((res: any) => {
                                                    const statusConfig: any = {
                                                        pending: { label: '承認待ち', color: '#F57F17' },
                                                        confirmed: { label: '承認済', color: '#2E7D32' },
                                                        cancelled: { label: 'キャンセル', color: '#C62828' },
                                                        completed: { label: '来店完了', color: '#6A1B9A' },
                                                        expired: { label: 'タイムアウト', color: '#737373' },
                                                    }
                                                    return (
                                                        <div key={res.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F2F2F2', fontSize: 12 }}>
                                                            <div>
                                                                <span style={{ fontWeight: 700, color: statusConfig[res.status]?.color, marginRight: 8, fontSize: 10 }}>
                                                                    {statusConfig[res.status]?.label}
                                                                </span>
                                                                {res.menus?.name}
                                                                {res.stylists?.name && <span style={{ color: '#737373' }}> / {res.stylists.name}</span>}
                                                            </div>
                                                            <div style={{ color: '#737373', flexShrink: 0, marginLeft: 12 }}>
                                                                {new Date(res.reserved_at).toLocaleDateString('ja-JP')}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                        </div>
                                    </details>
                                </div>
                            )
                        })}
                    </div>
                )}



            </div>
        </div>
    )
}