'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { REGIONS } from '@/lib/areas'
import { DAY_NAMES } from '@/lib/availability'
import Link from 'next/link'

const GENRES = ['ヘアサロン', 'ネイル・まつげ', 'リラク・エステ']

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
    const [tab, setTab] = useState<'salon' | 'menus' | 'stylists' | 'reservations'>('salon')

    const [blocks, setBlocks] = useState<any[]>([])

    const topImageRef = useRef<HTMLInputElement>(null)
    const galleryRef = useRef<HTMLInputElement>(null)

    const [salonForm, setSalonForm] = useState({
        name: '', genre: 'ヘアサロン', prefecture: '北海道', area: '札幌市中央区',
        address: '', nearest_station: '', description: '', phone: '', slot_interval: 30
    })
    const [menuForm, setMenuForm] = useState({ name: '', price: '', duration: '', description: '' })
    const [stylistForm, setStylistForm] = useState({ name: '', role: '', experience_years: '', description: '', instagram: '' })
    const [stylistImageFile, setStylistImageFile] = useState<File | null>(null)
    const [stylistImagePreview, setStylistImagePreview] = useState('')
    const [editingScheduleStylistId, setEditingScheduleStylistId] = useState<string | null>(null)
    const [scheduleForm, setScheduleForm] = useState<any[]>([])
    const [scheduleSaving, setScheduleSaving] = useState(false)

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
                name: salonData.name || '', genre: salonData.genre || 'ヘアサロン', prefecture: pref,
                area: salonData.area || '', address: salonData.address || '',
                nearest_station: salonData.nearest_station || '', description: salonData.description || '',
                phone: salonData.phone || '', slot_interval: salonData.slot_interval || 30,
            })
            const { data: menuData } = await supabase.from('menus').select('*').eq('salon_id', salonData.id)
            setMenus(menuData || [])
            const { data: stylistData } = await supabase.from('stylists').select('*').eq('salon_id', salonData.id)
            setStylists(stylistData || [])
            const { data: resData } = await supabase.from('reservations')
                .select('*, menus(name, price), stylists(name)').eq('salon_id', salonData.id)
                .order('reserved_at', { ascending: false })
            setReservations(resData || [])

            const { data: blockData } = await supabase
                .from('blocks')
                .select('*')
                .eq('blocker_id', user.id)
            setBlocks(blockData || [])
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
        if (!salonForm.name || !salonForm.area || !salonForm.address) { alert('サロン名・エリア・住所は必須です'); return }
        setSaving(true)
        const payload = {
            name: salonForm.name, genre: salonForm.genre, area: salonForm.area,
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

    if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: '#737373' }}>読み込み中...</div></div>

    const statusConfig: any = {
        pending: { label: '承認待ち', bg: '#FFF8E1', color: '#F57F17' },
        confirmed: { label: '承認済', bg: '#E8F5E9', color: '#2E7D32' },
        cancelled: { label: 'キャンセル', bg: '#FFEBEE', color: '#C62828' },
        completed: { label: '完了', bg: '#F3E5F5', color: '#6A1B9A' },
        expired: { label: 'タイムアウト', bg: '#FAFAFA', color: '#737373' },
    }

    const tabList = [
        { key: 'salon', label: 'サロン情報' },
        { key: 'menus', label: 'メニュー' },
        { key: 'stylists', label: 'スタイリスト' },
        { key: 'reservations', label: '予約管理' },
    ]

    const card: any = { background: 'white', borderRadius: 16, border: '1px solid #DBDBDB', padding: 24, marginBottom: 16 }

    return (
        <div style={{ minHeight: '100vh', background: '#FAFAFA' }}>
            {/* Header */}
            <header style={{ background: 'white', borderBottom: '1px solid #DBDBDB', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Link href="/" style={{ fontSize: 20, fontWeight: 700, textDecoration: 'none', ...gradText }}>Salon de Beauty</Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 12, color: '#737373' }}>{user?.email}</span>
                    <button onClick={() => router.push('/')} style={{ fontSize: 12, border: '1.5px solid #DBDBDB', background: 'none', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', color: '#262626' }}>トップへ</button>
                    <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }} style={{ background: grad, color: 'white', border: 'none', padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>ログアウト</button>
                </div>
            </header>

            {/* Tabs */}
            <div style={{ background: 'white', borderBottom: '1px solid #DBDBDB', padding: '0 32px', display: 'flex' }}>
                {tabList.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key as any)}
                        style={{ padding: '12px 20px', fontSize: 12, fontWeight: 700, border: 'none', borderBottom: tab === t.key ? '2px solid #E1306C' : '2px solid transparent', background: 'none', cursor: 'pointer', color: tab === t.key ? '#111' : '#737373', fontFamily: 'inherit', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
                        {t.label}
                    </button>
                ))}
            </div>

            <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 32px' }}>

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
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 8 }}>
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
                                <label style={labelStyle}>ジャンル *</label>
                                <select value={salonForm.genre} onChange={e => setSalonForm({ ...salonForm, genre: e.target.value })} style={{ ...inputStyle }}>
                                    {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
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
                            <button onClick={saveSalon} disabled={saving}
                                style={{ width: '100%', background: grad, color: 'white', border: 'none', padding: 13, borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}>
                                {saving ? '保存中...' : salon ? '更新する' : '登録する'}
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
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 14, fontWeight: 700 }}>{menu.name}</div>
                                            {menu.description && <div style={{ fontSize: 11, color: '#737373', marginTop: 2, lineHeight: 1.5 }}>{menu.description}</div>}
                                            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4, ...gradText }}>¥{menu.price.toLocaleString()}&nbsp;&nbsp;<span style={{ fontSize: 11, color: '#737373', background: 'none', WebkitTextFillColor: '#737373' }}>{menu.duration}分</span></div>
                                        </div>
                                        <button onClick={() => deleteMenu(menu.id)} style={{ fontSize: 11, fontWeight: 700, border: '1.5px solid #FFCDD2', background: '#FFEBEE', color: '#C62828', padding: '4px 10px', borderRadius: 8, cursor: 'pointer', marginLeft: 12, flexShrink: 0, fontFamily: 'inherit' }}>削除</button>
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

                {/* RESERVATIONS TAB */}
                {tab === 'reservations' && (
                    <div style={card}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#737373', letterSpacing: '0.08em', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #DBDBDB' }}>予約一覧（{reservations.length}件）</div>
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
            </div>
        </div>
    )
}